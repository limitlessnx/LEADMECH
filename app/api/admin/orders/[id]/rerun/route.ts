import { NextResponse } from 'next/server';
import { buildApifyInput } from '@/lib/search-payload';
import { getSiteUrl } from '@/lib/site';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

type RepairOrder = {
  id: string;
  user_id: string;
  order_code: string;
  status: string;
  payment_status: string | null;
  requested_count: number | null;
  delivered_count: number | null;
  delivery_email: string | null;
  search_filters: Record<string, unknown> | null;
  packages: { lead_count: number } | { lead_count: number }[] | null;
};

async function requireApiAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  }

  return { user };
}

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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireApiAdmin();
  if ('error' in adminCheck) return adminCheck.error;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,user_id,order_code,status,payment_status,requested_count,delivered_count,delivery_email,search_filters,packages(lead_count)')
    .eq('id', id)
    .single<RepairOrder>();

  if (orderError || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (!['paid', 'ready_for_search', 'completed', 'failed', 'no_results'].includes(order.status)) {
    return NextResponse.json({ error: 'This order is not eligible for repair.' }, { status: 409 });
  }
  if (!order.payment_status || ['awaiting', 'invoice_created'].some((state) => order.payment_status?.includes(state))) {
    return NextResponse.json({ error: 'This order has not been paid.' }, { status: 409 });
  }

  const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
  const leadCount = order.requested_count ?? packageInfo?.lead_count ?? 0;
  if (!leadCount || leadCount < 1) return NextResponse.json({ error: 'Order lead count is missing.' }, { status: 409 });
  if (!order.delivery_email) return NextResponse.json({ error: 'Delivery email is missing.' }, { status: 409 });

  const actorId = process.env.APIFY_ACTOR_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!actorId || !token) return NextResponse.json({ error: 'Apify is not configured.' }, { status: 503 });

  const search = order.search_filters ?? {};
  const actorInput = buildApifyInput({
    ...search,
    totalResults: leadCount,
  });
  const webhooks = actorWebhooks(order.id);

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
      : 'Unable to start the Apify repair run.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await admin.from('orders').update({
    status: 'processing',
    requested_count: leadCount,
    delivered_count: 0,
    delivery_email: order.delivery_email,
    apify_run_id: apifyData.data.id,
    apify_dataset_id: apifyData.data.defaultDatasetId ?? null,
    apify_input: actorInput,
    search_filters: { ...search, _repairRun: true },
    started_at: new Date().toISOString(),
    completed_at: null,
    csv_path: null,
    xlsx_path: null,
    error_message: null,
  }).eq('id', order.id);

  return NextResponse.json({
    ok: true,
    orderCode: order.order_code,
    requested: leadCount,
    previousDelivered: order.delivered_count ?? 0,
    runId: apifyData.data.id,
    status: apifyData.data.status ?? 'processing',
  });
}
