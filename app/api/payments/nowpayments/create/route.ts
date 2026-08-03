import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSiteUrl, requireEnv } from '@/lib/site';
import { getPackage } from '@/lib/packages';

const TEST_COUPON_CODE = 'LEADMECHDEV100';
const TEST_COUPON_STATUS = 'coupon_LEADMECHDEV100';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Please sign in before checkout.' }, { status: 401 });

  const { packageId, couponCode } = await request.json();
  const selectedPackage = getPackage(packageId);
  const normalizedCoupon = String(couponCode || '').trim().toUpperCase();
  const admin = createAdminClient();
  const { data: packageRow, error: packageError } = await admin
    .from('packages')
    .select('id,name,lead_count,price_usd')
    .eq('lead_count', selectedPackage.leads)
    .eq('active', true)
    .single();

  if (packageError || !packageRow) return NextResponse.json({ error: 'Package is not available.' }, { status: 400 });

  if (normalizedCoupon && normalizedCoupon !== TEST_COUPON_CODE) {
    return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 400 });
  }

  const isTestCoupon = normalizedCoupon === TEST_COUPON_CODE;
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: user.id,
      package_id: packageRow.id,
      requested_count: packageRow.lead_count,
      delivery_email: user.email,
      status: isTestCoupon ? 'ready_for_search' : 'awaiting_payment',
      payment_status: isTestCoupon ? TEST_COUPON_STATUS : null,
      paid_at: isTestCoupon ? new Date().toISOString() : null,
    })
    .select('id,order_code')
    .single();

  if (orderError || !order) return NextResponse.json({ error: 'Unable to create order.' }, { status: 500 });

  const siteUrl = getSiteUrl();

  if (isTestCoupon) {
    return NextResponse.json({
      orderId: order.id,
      orderCode: order.order_code,
      couponApplied: true,
      successPath: `/search?order=${order.id}`,
    });
  }

  let apiKey: string;
  try {
    apiKey = requireEnv('NOWPAYMENTS_API_KEY');
  } catch {
    return NextResponse.json({ error: 'NOWPayments is not configured yet. Add NOWPAYMENTS_API_KEY in Vercel.' }, { status: 503 });
  }

  const paymentResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      price_amount: Number(packageRow.price_usd),
      price_currency: 'usd',
      order_id: order.id,
      order_description: `Leadmech ${packageRow.name} package - ${packageRow.lead_count} leads`,
      ipn_callback_url: `${siteUrl}/api/webhooks/nowpayments`,
      success_url: `${siteUrl}/search?order=${order.id}`,
      cancel_url: `${siteUrl}/checkout?package=${selectedPackage.id}`,
    }),
  });

  const paymentData = await paymentResponse.json();
  if (!paymentResponse.ok || !paymentData.invoice_url) {
    await admin.from('orders').update({ status: 'failed', error_message: paymentData.message || 'NOWPayments checkout failed.' }).eq('id', order.id);
    return NextResponse.json({ error: paymentData.message || 'Unable to create crypto checkout.' }, { status: 502 });
  }

  await admin
    .from('orders')
    .update({ payment_id: String(paymentData.id), payment_status: 'invoice_created' })
    .eq('id', order.id);

  return NextResponse.json({ orderId: order.id, orderCode: order.order_code, invoiceUrl: paymentData.invoice_url });
}
