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
  original_requested_count: number | null;
  delivered_count: number | null;
  remaining_leads: number | null;
  customer_attempts_used: number;
  max_customer_attempts: number;
  delivery_email: string | null;
  search_filters: Record<string, unknown> | null;
  packages: { lead_count: number } | { lead_count: number }[] | null;
};

const SUCCESSFUL_PAYMENT_STATUSES = new Set(['finished', 'confirmed']);

function actorWebhooks(orderId: string) {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  const requestUrl = `${getSiteUrl()}/api/webhooks/apify${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`;
  return Buffer.from(JSON.stringify([{
    eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.TIMED_OUT', 'ACTOR.RUN.ABORTED'],
    requestUrl,
    payloadTemplate: JSON.stringify({ orderId, eventType: '{{eventType}}', resource: '{{resource}}' }).replace('"{{resource}}"', '{{resource}}'),
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
    .select('id,order_code,user_id,status,payment_status,requested_count,original_requested_count,delivered_count,remaining_leads,customer_attempts_used,max_customer_attempts,delivery_email,search_filters,packages(lead_count)')
    .eq('id', id)
    .single<RerunOrder>();

  if (orderError || !order || order.user_id !== user.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  // Customer retries are deliberately allowed only after a completed/empty search.
  // A failed Apify run is a provider/system failure and must never be retried by the
  // customer, otherwise the same paid order can repeatedly consume Apify credits.
  if (!['completed', 'no_results'].includes(order.status)) {
    return NextResponse.json({ error: 'This order is not eligible for a customer retry. Failed searches must be reviewed by support.' }, { status: 409 });
  }
  if (!SUCCESSFUL_PAYMENT_STATUSES.has(order.payment_status ?? '')) return NextResponse.json({ error: 'This order has not been paid.' }, { status: 402 });

  const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
  const purchased = order.original_requested_count ?? order.requested_count ?? packageInfo?.lead_count ?? 0;
  const deliveredCount = order.delivered_count ?? 0;
  const remaining = order.remaining_leads ?? Math.max(purchased - deliveredCount, 0);
  const maxAttempts = order.max_customer_attempts ?? 3;
  const usedAttempts = order.customer_attempts_used ?? 0;
  if (!purchased || remaining <= 0) return NextResponse.json({ error: 'This lead order is already complete.' }, { status: 409 });
  if (usedAttempts >= maxAttempts) return NextResponse.json({ error: 'You have used all 3 search attempts for this order.' }, { status: 409 });
  if (!order.delivery_email) return NextResponse.json({ error: 'Delivery email is missing.' }, { status: 409 });

  const actorId = process.env.APIFY_ACTOR_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!actorId || !token) return NextResponse.json({ error: 'Apify is not configured yet.' }, { status: 503 });

  const search = order.search_filters ?? {};
  const actorInput = buildApifyInput({ ...search, totalResults: remaining });
  const webhooks = actorWebhooks(order.id);
  const nextAttempt = usedAttempts + 1;

  const { data: claimed, error: claimError } = await admin.from('orders').update({
    status: 'processing',
    requested_count: remaining,
    remaining_leads: remaining,
    customer_attempts_used: nextAttempt,
    apify_input: actorInput,
    search_filters: { ...search, _dashboardRerun: true, _skipCompletionEmail: false },
    started_at: new Date().toISOString(),
    completed_at: null,
    error_message: null,
  })
    .eq('id', order.id)
    .eq('user_id', user.id)
    .eq('status', order.status)
    .in('payment_status', Array.from(SUCCESSFUL_PAYMENT_STATUSES))
    .lt('customer_attempts_used', maxAttempts)
    .select('id')
    .maybeSingle();

  if (claimError || !claimed) return NextResponse.json({ error: 'This order has already been started or its attempt limit was reached.' }, { status: 409 });

  const apifyResponse = await fetch(`https://api.apify.com/v2/actors/${actorId}/runs?waitForFinish=0&webhooks=${encodeURIComponent(webhooks)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(actorInput),
    cache: 'no-store',
  });
  const apifyData = await apifyResponse.json().catch(() => ({}));
  if (!apifyResponse.ok || !apifyData?.data?.id) {
    const message = typeof apifyData?.error?.message === 'string' ? apifyData.error.message : typeof apifyData?.message === 'string' ? apifyData.message : 'Unable to start the search again.';
    await admin.from('orders').update({ status: 'failed', error_message: message }).eq('id', id).eq('status', 'processing');
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const runId = apifyData.data.id as string;
  await admin.from('orders').update({ apify_run_id: runId, apify_dataset_id: apifyData.data.defaultDatasetId ?? null }).eq('id', id).eq('status', 'processing');
  await admin.from('search_attempts').insert({ order_id: order.id, attempt_number: nextAttempt, source: 'customer', apify_run_id: runId, apify_dataset_id: apifyData.data.defaultDatasetId ?? null, status: 'started', requested_count: remaining, apify_input: actorInput });

  return redirectToDashboard(request);
}
