import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildApifyInput } from '@/lib/search-payload';
import { getSiteUrl } from '@/lib/site';

type RerunOrder = {
  id: string;
  order_code: string;
  user_id: string;
  status: string;
  payment_status: string | null;
  requested_count: number | null;
  delivered_count: number | null;
  delivery_email: string | null;
  search_filters: Record<string, unknown> | null;
  packages: { lead_count: number } | { lead_count: number }[] | null;
};

function actorWebhooks(orderId: string) {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  const requestUrl = `${getSiteUrl()}/api/webhooks/apify${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`;
  return Buffer.from(JSON.stringify([{
    eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.TIMED_OUT', 'ACTOR.RUN.ABORTED'],
    requestUrl,
    payloadTemplate: JSON.stringify({
      orderId,
      eventType: '{{eventType}}',
      resource: '{{resource}}',
    }).replace('"{{resource}}"', '{{resource}}'),
    shouldInterpolateStrings: true,
  }])).toString('base64');
}

function redirectToDashboard(request: Request) {
  return NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,order_code,user_id,status,payment_status,requested_count,delivered_count,delivery_email,search_filters,packages(lead_count)')
    .eq('id', id)
    .single<RerunOrder>();

  if (orderError || !order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (!['completed', 'failed', 'no_results'].includes(order.status)) {
    return NextResponse.json({ error: 'This order cannot be searched again right now.' }, { status: 409 });
  }
  if (!order.payment_status || ['awaiting', 'invoice_created'].some((state) => order.payment_status?.includes(state))) {
    return NextResponse.json({ error: 'This order has not been paid.' }, { status: 409 });
  }

  const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
  const leadCount = order.requested_count ?? packageInfo?.lead_count ?? 0;
  const deliveredCount = order.delivered_count ?? 0;
  if (!leadCount || deliveredCount >= leadCount) {
    return NextResponse.json({ error: 'This order is already complete.' }, { status: 409 });
  }
  if (!order.delivery_email) return NextResponse.json({ error: 'Delivery email is missing.' }, { status: 409 });

  const actorId = process.env.APIFY_ACTOR_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!actorId || !token) return NextResponse.json({ error: 'Apify is not configured yet.' }, { status: 503 });

  const search = order.search_filters ?? {};
  const actorInput = buildApifyInput({
    ...search,
    totalResults: leadCount,
  });
  const webhooks = actorWebhooks(order.id);

  await admin.from('orders').update({
    status: 'processing',
    requested_count: leadCount,
    delivered_count: 0,
    apify_input: actorInput,
    search_filters: {
      ...search,
      _dashboardRerun: true,
      _skipCompletionEmail: true,
    },
    started_at: new Date().toISOString(),
    completed_at: null,
    csv_path: null,
    xlsx_path: null,
    error_message: null,
  }).eq('id', order.id);

  const apifyResponse = await fetch(`https://api.apify.com/v2/actors/${actorId}/runs?waitForFinish=0&webhooks=${encodeURIComponent(webhooks)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(actorInput),
    cache: 'no-store',
  });

  const apifyData = await apifyResponse.json().catch(() => ({}));
  if (!apifyResponse.ok || !apifyData?.data?.id) {
    const message = typeof apifyData?.error?.message === 'string'
      ? apifyData.error.message
      : typeof apifyData?.message === 'string'
      ? apifyData.message
      : 'Unable to start the search again.';
    await admin.from('orders').update({ status: 'failed', error_message: message }).eq('id', id);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await admin.from('orders').update({
    apify_run_id: apifyData.data.id,
    apify_dataset_id: apifyData.data.defaultDatasetId ?? null,
  }).eq('id', id);

  return redirectToDashboard(request);
}
