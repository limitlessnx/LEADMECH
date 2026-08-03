import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEBUG_SECRET = 'leadmech-debug-2026-08-03';

function summarize(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 5).map(summarize);
  if (!value || typeof value !== 'object') return value;
  const row = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(row).slice(0, 40)) {
    if (typeof item === 'string') result[key] = item.slice(0, 180);
    else if (typeof item === 'number' || typeof item === 'boolean' || item === null) result[key] = item;
    else if (Array.isArray(item)) result[key] = item.slice(0, 5);
    else if (typeof item === 'object') result[key] = Object.keys(item as Record<string, unknown>).slice(0, 20);
  }
  return result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('secret') !== DEBUG_SECRET) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const orderId = url.searchParams.get('order');
  if (!orderId) return NextResponse.json({ error: 'Missing order' }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id,apify_run_id,apify_dataset_id,apify_input,error_message,status')
    .eq('id', orderId)
    .single();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'Missing Apify token' }, { status: 500 });

  const runResponse = order.apify_run_id
    ? await fetch(`https://api.apify.com/v2/actor-runs/${order.apify_run_id}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
    : null;
  const runJson = runResponse ? await runResponse.json().catch(() => null) : null;

  const datasetResponse = order.apify_dataset_id
    ? await fetch(`https://api.apify.com/v2/datasets/${order.apify_dataset_id}/items?clean=true&format=json&limit=10`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
    : null;
  const datasetJson = datasetResponse ? await datasetResponse.json().catch(() => null) : null;

  return NextResponse.json({
    order,
    runStatus: runJson?.data?.status,
    runStatusMessage: runJson?.data?.statusMessage,
    datasetStatus: datasetResponse?.status,
    datasetSummary: summarize(datasetJson),
  });
}
