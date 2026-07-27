import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildApifyInput } from '@/lib/search-payload';
import { getSiteUrl } from '@/lib/site';

type StartOrder = {
  id: string;
  user_id: string;
  status: string;
  requested_count: number | null;
  packages: { lead_count: number } | { lead_count: number }[] | null;
};

function webhookQuery() {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  return secret ? `?secret=${encodeURIComponent(secret)}` : '';
}

function buildRunWebhooks(orderId: string) {
  const requestUrl = `${getSiteUrl()}/api/webhooks/apify${webhookQuery()}`;
  return Buffer.from(JSON.stringify([
    {
      eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.TIMED_OUT', 'ACTOR.RUN.ABORTED'],
      requestUrl,
      payloadTemplate: JSON.stringify({
        orderId,
        eventType: '{{eventType}}',
        resource: '{{resource}}',
      }),
    },
  ])).toString('base64');
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const { search } = await request.json();
  const deliveryEmail = search?.email;
  const confirmEmail = search?.confirmEmail;
  if (!deliveryEmail || deliveryEmail !== confirmEmail) {
    return NextResponse.json({ error: 'Delivery emails must match.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,user_id,status,requested_count,packages(lead_count)')
    .eq('id', id)
    .single<StartOrder>();

  if (orderError || !order || order.user_id !== user.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (!['paid', 'ready_for_search'].includes(order.status)) return NextResponse.json({ error: 'This order is not ready for search.' }, { status: 409 });

  const actorId = process.env.APIFY_ACTOR_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!actorId || !token) return NextResponse.json({ error: 'Apify is not configured yet. Add APIFY_ACTOR_ID and APIFY_API_TOKEN.' }, { status: 503 });

  const apifyInput = buildApifyInput(search ?? {});
  const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
  const limit = order.requested_count ?? packageInfo?.lead_count ?? 0;
  const runUrl = new URL(`https://api.apify.com/v2/actors/${actorId}/runs`);
  runUrl.searchParams.set('waitForFinish', '0');
  runUrl.searchParams.set('maxItems', String(limit));
  runUrl.searchParams.set('webhooks', buildRunWebhooks(id));

  const response = await fetch(runUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(apifyInput),
  });
  const data = await response.json();

  if (!response.ok || !data?.data?.id) {
    await admin.from('orders').update({ status: 'failed', error_message: data?.error?.message || 'Apify start failed.' }).eq('id', id);
    return NextResponse.json({ error: data?.error?.message || 'Unable to start Apify actor.' }, { status: 502 });
  }

  await admin
    .from('orders')
    .update({
      status: 'processing',
      delivery_email: deliveryEmail,
      search_filters: search ?? {},
      apify_input: apifyInput,
      apify_run_id: data.data.id,
      apify_dataset_id: data.data.defaultDatasetId,
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', id);

  return NextResponse.json({ ok: true, runId: data.data.id, status: data.data.status });
}
