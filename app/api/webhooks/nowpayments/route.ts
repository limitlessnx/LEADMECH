import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPaymentConfirmationEmail } from '@/lib/email';

function sortPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortPayload);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortPayload((value as Record<string, unknown>)[key]);
      return result;
    }, {});
  }
  return value;
}

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;
  const sorted = JSON.stringify(sortPayload(JSON.parse(rawBody)));
  const expected = crypto.createHmac('sha512', secret).update(sorted).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

const SUCCESSFUL_PAYMENT_STATUSES = new Set(['finished', 'confirmed']);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-nowpayments-sig');
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const orderId = payload.order_id;
  const paymentStatus = String(payload.payment_status || payload.invoice_status || 'unknown').toLowerCase();
  if (!orderId) return NextResponse.json({ error: 'Missing order id' }, { status: 400 });

  const admin = createAdminClient();
  const { data: currentOrder, error: lookupError } = await admin
    .from('orders')
    .select('id,status,payment_status,order_code,delivery_email,requested_count,packages(name,lead_count,price_usd)')
    .eq('id', orderId)
    .single();

  if (lookupError || !currentOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const isSuccessful = SUCCESSFUL_PAYMENT_STATUSES.has(paymentStatus);

  // Pending, waiting, expired, failed, and partial payments never unlock search.
  // Also do not downgrade an already successful/processing/completed order when
  // a later non-success webhook arrives.
  if (!isSuccessful) {
    if (SUCCESSFUL_PAYMENT_STATUSES.has(currentOrder.payment_status) || ['processing', 'completed'].includes(currentOrder.status)) {
      return NextResponse.json({ received: true, status: paymentStatus, ignored: true });
    }

    await admin.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
    return NextResponse.json({ received: true, status: paymentStatus, unlocked: false });
  }

  const nextStatus = ['processing', 'completed'].includes(currentOrder.status)
    ? currentOrder.status
    : 'ready_for_search';

  const { data: order, error } = await admin
    .from('orders')
    .update({
      status: nextStatus,
      payment_status: paymentStatus,
      paid_at: currentOrder.payment_status && SUCCESSFUL_PAYMENT_STATUSES.has(currentOrder.payment_status)
        ? undefined
        : new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('id,order_code,delivery_email,requested_count,packages(name,lead_count,price_usd)')
    .single();

  if (error || !order) return NextResponse.json({ error: 'Unable to update order' }, { status: 500 });

  if (!currentOrder.payment_status || !SUCCESSFUL_PAYMENT_STATUSES.has(currentOrder.payment_status)) {
    if (process.env.RESEND_API_KEY) {
      const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
      await sendPaymentConfirmationEmail({
        to: order.delivery_email,
        orderCode: order.order_code,
        packageName: packageInfo?.name ?? 'Lead package',
        leadCount: order.requested_count ?? packageInfo?.lead_count ?? 0,
        amount: Number(packageInfo?.price_usd ?? 0),
      });
    }
  }

  return NextResponse.json({ received: true, status: paymentStatus, unlocked: true });
}
