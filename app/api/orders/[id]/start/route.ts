import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildApifyInput } from '@/lib/search-payload';
import { getSiteUrl } from '@/lib/site';

type StartOrder = {
  id: string;
  order_code: string;
  user_id: string;
  status: string;
  requested_count: number | null;
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

  if (personCountries[0] === 'United States' && personStates[0]) {
    for (const city of personCities) {
      const expectedState = US_CITY_STATE[city];
      if (expectedState && expectedState !== personStates[0]) {
        return `${city} is in ${expectedState}, not ${personStates[0]}. Correct the person location before starting the search.`;
      }
    }
  }

  const companyCountries = splitValues(search.companyCountries);
  const companyStates = splitValues(search.companyStates);
  const companyCities = splitValues(search.companyCities);

  if (companyCountries[0] === 'United States' && companyStates[0]) {
    for (const city of companyCities) {
      const expectedState = US_CITY_STATE[city];
      if (expectedState && expectedState !== companyStates[0]) {
        return `${city} is in ${expectedState}, not ${companyStates[0]}. Correct the company location before starting the search.`;
      }
    }
  }

  return null;
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

  const locationError = validateLocation(search ?? {});
  if (locationError) {
    return NextResponse.json({ error: locationError }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,order_code,user_id,status,requested_count,packages(name,lead_count,price_usd)')
    .eq('id', id)
    .single<StartOrder>();

  if (orderError || !order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (!['paid', 'ready_for_search'].includes(order.status)) {
    return NextResponse.json({ error: 'This order is not ready for search.' }, { status: 409 });
  }

  const actorId = process.env.APIFY_ACTOR_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!actorId || !token) {
    return NextResponse.json({ error: 'Apify is not configured yet.' }, { status: 503 });
  }

  const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
  const leadCount = order.requested_count ?? packageInfo?.lead_count ?? 0;
  const actorInput = { count: leadCount, ...buildApifyInput(search ?? {}) };
  const siteUrl = getSiteUrl();
  const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
  const completionWebhookUrl = `${siteUrl}/api/webhooks/apify${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ''}`;
  const webhooks = Buffer.from(JSON.stringify([{
    eventTypes: [
      'ACTOR.RUN.SUCCEEDED',
      'ACTOR.RUN.FAILED',
      'ACTOR.RUN.TIMED_OUT',
      'ACTOR.RUN.ABORTED',
    ],
    requestUrl: completionWebhookUrl,
    payloadTemplate: JSON.stringify({
      orderId: id,
      eventType: '{{eventType}}',
      resource: '{{resource}}',
    }).replace('"{{resource}}"', '{{resource}}'),
    shouldInterpolateStrings: true,
  }])).toString('base64');

  await admin
    .from('orders')
    .update({
      status: 'processing',
      requested_count: leadCount,
      delivery_email: deliveryEmail,
      search_filters: search ?? {},
      apify_input: actorInput,
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', id);

  const apifyResponse = await fetch(`https://api.apify.com/v2/actors/${actorId}/runs?waitForFinish=0&webhooks=${encodeURIComponent(webhooks)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(actorInput),
    cache: 'no-store',
  });

  const apifyData = await apifyResponse.json().catch(() => ({}));

  if (!apifyResponse.ok || !apifyData?.data?.id) {
    const message = typeof apifyData?.error?.message === 'string'
      ? apifyData.error.message
      : typeof apifyData?.message === 'string'
      ? apifyData.message
      : typeof apifyData?.error === 'string'
      ? apifyData.error
      : 'Unable to start the Apify lead search.';

    await admin
      .from('orders')
      .update({ status: 'failed', error_message: message })
      .eq('id', id);

    return NextResponse.json({ error: message }, { status: 502 });
  }

  await admin
    .from('orders')
    .update({
      status: 'processing',
      apify_run_id: apifyData.data.id,
      apify_dataset_id: apifyData.data.defaultDatasetId ?? null,
    })
    .eq('id', id);

  return NextResponse.json({
    ok: true,
    status: apifyData.data.status ?? 'processing',
    runId: apifyData.data.id,
  });
}
