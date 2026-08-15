import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildApifyInput, validateApifyInputAgainstActorSchema } from '@/lib/search-payload';
import { getSiteUrl } from '@/lib/site';

type StartOrder = {
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
  packages: { name: string; lead_count: number; price_usd: number } | { name: string; lead_count: number; price_usd: number }[] | null;
};

const US_CITY_STATE: Record<string, string> = {
  Atlanta: 'Georgia', Austin: 'Texas', Baltimore: 'Maryland', Boston: 'Massachusetts',
  Charlotte: 'North Carolina', Chicago: 'Illinois', Dallas: 'Texas', Denver: 'Colorado',
  Houston: 'Texas', 'Las Vegas': 'Nevada', 'Los Angeles': 'California', Miami: 'Florida',
  'New York City': 'New York', Orlando: 'Florida', Philadelphia: 'Pennsylvania',
  Phoenix: 'Arizona', 'San Diego': 'California', 'San Francisco': 'California',
  Seattle: 'Washington', Washington: 'District of Columbia',
};

function splitValues(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function validateLocation(search: Record<string, unknown>) {
  const personCountries = splitValues(search.personCountries);
  const personStates = splitValues(search.personStates);
  const personCities = splitValues(search.personCities);
  if (personCountries[0] === 'United States' && personStates[0]) for (const city of personCities) {
    const expectedState = US_CITY_STATE[city];
    if (expectedState && expectedState !== personStates[0]) return `${city} is in ${expectedState}, not ${personStates[0]}. Correct the person location before starting the search.`;
  }
  const companyCountries = splitValues(search.companyCountries);
  const companyStates = splitValues(search.companyStates);
  const companyCities = splitValues(search.companyCities);
  if (companyCountries[0] === 'United States' && companyStates[0]) for (const city of companyCities) {
    const expectedState = US_CITY_STATE[city];
    if (expectedState && expectedState !== companyStates[0]) return `${city} is in ${expectedState}, not ${companyStates[0]}. Correct the company location before starting the search.`;
  }
  return null;
}

const SUCCESSFUL_PAYMENT_STATUSES = new Set(['finished', 'confirmed']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { search } = await request.json();
  const deliveryEmail = search?.email;
  const confirmEmail = search?.confirmEmail;
  if (!deliveryEmail || deliveryEmail !== confirmEmail) return NextResponse.json({ error: 'Delivery emails must match.' }, { status: 400 });
  const locationError = validateLocation(search ?? {});
  if (locationError) return NextResponse.json({ error: locationError }, { status: 400 });

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin.from('orders').select('id,order_code,user_id,status,payment_status,requested_count,original_requested_count,delivered_count,remaining_leads,customer_attempts_used,max_customer_attempts,packages(name,lead_count,price_usd)').eq('id', id).single<StartOrder>();
  if (orderError || !order || order.user_id !== user.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (!SUCCESSFUL_PAYMENT_STATUSES.has(order.payment_status ?? '')) return NextResponse.json({ error: 'Payment has not been confirmed. Complete payment before starting your lead search.' }, { status: 402 });
  if (!['paid', 'ready_for_search'].includes(order.status)) return NextResponse.json({ error: 'This order is not available for a new search.' }, { status: 409 });

  const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
  const purchased = order.original_requested_count ?? order.requested_count ?? packageInfo?.lead_count ?? 0;
  const delivered = order.delivered_count ?? 0;
  const remaining = order.remaining_leads ?? Math.max(purchased - delivered, 0);
  if (remaining <= 0) return NextResponse.json({ error: 'This lead order is complete.' }, { status: 409 });
  if ((order.customer_attempts_used ?? 0) >= (order.max_customer_attempts ?? 3)) return NextResponse.json({ error: 'You have used all 3 search attempts for this order.' }, { status: 409 });

  const actorId = process.env.APIFY_ACTOR_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!actorId || !token) return NextResponse.json({ error: 'Apify is not configured yet.' }, { status: 503 });
  const actorInput = buildApifyInput({ ...(search ?? {}), totalResults: remaining });

  // Validate the exact payload against the actor schema BEFORE claiming the paid order.
  // Invalid inputs therefore consume neither an attempt nor an Apify run.
  const schemaCheck = await validateApifyInputAgainstActorSchema(actorId, token, actorInput);
  if (!schemaCheck.valid) return NextResponse.json({ error: schemaCheck.error }, { status: 400 });

  const siteUrl = getSiteUrl();
  const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
  const completionWebhookUrl = `${siteUrl}/api/webhooks/apify${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ''}`;
  const webhooks = Buffer.from(JSON.stringify([{
    eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.TIMED_OUT', 'ACTOR.RUN.ABORTED'],
    requestUrl: completionWebhookUrl,
    payloadTemplate: JSON.stringify({ orderId: id, eventType: '{{eventType}}', resource: '{{resource}}' }).replace('"{{resource}}"', '{{resource}}'),
    shouldInterpolateStrings: true,
  }])).toString('base64');

  const nextAttempt = (order.customer_attempts_used ?? 0) + 1;
  const { data: claimed, error: claimError } = await admin.from('orders').update({ status: 'processing', original_requested_count: purchased, requested_count: remaining, remaining_leads: remaining, customer_attempts_used: nextAttempt, delivery_email: deliveryEmail, search_filters: search ?? {}, apify_input: actorInput, started_at: new Date().toISOString(), completed_at: null, error_message: null }).eq('id', id).eq('user_id', user.id).eq('status', order.status).in('payment_status', Array.from(SUCCESSFUL_PAYMENT_STATUSES)).lt('customer_attempts_used', order.max_customer_attempts ?? 3).select('id').maybeSingle();
  if (claimError || !claimed) return NextResponse.json({ error: 'This order has already been started, completed, or its attempt limit was reached.' }, { status: 409 });

  const apifyResponse = await fetch(`https://api.apify.com/v2/actors/${actorId}/runs?waitForFinish=0&webhooks=${encodeURIComponent(webhooks)}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(actorInput), cache: 'no-store',
  });
  const apifyData = await apifyResponse.json().catch(() => ({}));
  if (!apifyResponse.ok || !apifyData?.data?.id) {
    const message = typeof apifyData?.error?.message === 'string' ? apifyData.error.message : typeof apifyData?.message === 'string' ? apifyData.message : typeof apifyData?.error === 'string' ? apifyData.error : 'Unable to start the Apify lead search.';
    await admin.from('orders').update({ status: 'failed', error_message: message }).eq('id', id).eq('status', 'processing');
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const runId = apifyData.data.id as string;
  await admin.from('orders').update({ apify_run_id: runId, apify_dataset_id: apifyData.data.defaultDatasetId ?? null }).eq('id', id).eq('status', 'processing');
  await admin.from('search_attempts').insert({ order_id: id, attempt_number: nextAttempt, source: 'customer', apify_run_id: runId, apify_dataset_id: apifyData.data.defaultDatasetId ?? null, status: 'started', requested_count: remaining, apify_input: actorInput });

  return NextResponse.json({ ok: true, status: apifyData.data.status ?? 'processing', runId, requested: remaining, attempt: nextAttempt, attemptsRemaining: (order.max_customer_attempts ?? 3) - nextAttempt });
}
