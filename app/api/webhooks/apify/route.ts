import { NextResponse } from 'next/server';
import { cleanLead } from '@/lib/clean-leads';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCompletionEmail } from '@/lib/email';
import { rowsToCsv, rowsToXlsx } from '@/lib/export-files';
import { getSiteUrl } from '@/lib/site';

type ApifyEvent = { orderId?: string; eventType?: string; resource?: { id?: string; status?: string; defaultDatasetId?: string } };
type LeadObject = Record<string, unknown>;

function isLeadRecord(value: unknown): value is LeadObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as LeadObject;
  if (row.recordType === 'diagnostic' || row.rowType === 'diagnostic' || row.status === 'no_results') return false;
  return [row.email, row.fullName, row.firstName, row.lastName, row.linkedinUrl, row.companyName, row.companyDomain]
    .some((field) => typeof field === 'string' && field.trim().length > 0);
}

function allDatasetObjects(value: unknown): LeadObject[] {
  if (Array.isArray(value)) return value.filter((item): item is LeadObject => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  if (!value || typeof value !== 'object') return [];
  const object = value as LeadObject;
  for (const candidate of [object.items, object.data, object.results, object.leads]) {
    if (Array.isArray(candidate)) return candidate.filter((item): item is LeadObject => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  }
  return [object];
}

function extractDatasetRows(value: unknown) { return allDatasetObjects(value).filter(isLeadRecord); }
function diagnosticMessage(value: unknown) {
  const diagnostic = allDatasetObjects(value).find((row) => row.recordType === 'diagnostic' || row.rowType === 'diagnostic' || row.status === 'no_results');
  if (!diagnostic) return null;
  const why = typeof diagnostic['a - whyZero'] === 'string' ? diagnostic['a - whyZero'] : 'No leads matched all selected filters together.';
  const suggestion = typeof diagnostic['b - topSuggestion'] === 'string' ? diagnostic['b - topSuggestion'] : '';
  return [why, suggestion].filter(Boolean).join(' ');
}
function leadKey(row: LeadObject) {
  const email = String(row.email ?? '').trim().toLowerCase();
  if (email) return `email:${email}`;
  const linkedin = String(row.linkedinUrl ?? row.linkedinURL ?? '').trim().toLowerCase();
  if (linkedin) return `linkedin:${linkedin}`;
  const name = String(row.fullName ?? `${row.firstName ?? ''} ${row.lastName ?? ''}`).trim().toLowerCase();
  const company = String(row.companyDomain ?? row.companyName ?? '').trim().toLowerCase();
  return `fallback:${name}|${company}`;
}
function mergeUnique(...groups: LeadObject[][]) {
  const seen = new Set<string>(); const merged: LeadObject[] = [];
  for (const row of groups.flat()) { const key = leadKey(row); if (!key || seen.has(key)) continue; seen.add(key); merged.push(row); }
  return merged;
}
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

export async function POST(request: Request) {
  const url = new URL(request.url);
  const configuredSecret = process.env.APIFY_WEBHOOK_SECRET;
  if (configuredSecret && url.searchParams.get('secret') !== configuredSecret) return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });

  const event = await request.json() as ApifyEvent;
  const admin = createAdminClient();
  const runId = event.resource?.id;
  const orderId = event.orderId;
  const datasetId = event.resource?.defaultDatasetId;
  const status = event.resource?.status || event.eventType || 'UNKNOWN';

  const orderQuery = admin.from('orders').select('id,user_id,order_code,status,payment_status,requested_count,original_requested_count,remaining_leads,delivered_count,delivery_email,apify_run_id,apify_input,search_filters').limit(1);
  const { data: orders, error: orderError } = orderId ? await orderQuery.eq('id', orderId) : await orderQuery.eq('apify_run_id', runId ?? '');
  const order = orders?.[0];
  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Ignore stale/duplicate callbacks from an older run. The current run is the only run allowed to mutate the order.
  if (runId && order.apify_run_id && order.apify_run_id !== runId) return NextResponse.json({ ok: true, ignored: true, reason: 'stale_run' });

  if (!status.includes('SUCCEEDED') && status !== 'SUCCEEDED') {
    await admin.from('search_attempts').update({ status: 'failed', error_message: `Apify run ended as ${status}`, completed_at: new Date().toISOString() }).eq('order_id', order.id).eq('apify_run_id', runId ?? '');
    await admin.from('orders').update({ status: 'ready_for_search', error_message: `Search attempt failed: ${status}. You may use another attempt if available.` }).eq('id', order.id).eq('status', 'processing');
    return NextResponse.json({ ok: true, status });
  }
  if (!datasetId) return NextResponse.json({ error: 'Missing dataset ID' }, { status: 400 });

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'Apify token is not configured' }, { status: 500 });
  const limit = order.requested_count ?? order.remaining_leads ?? order.original_requested_count ?? 50000;
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&limit=${limit}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) {
    await admin.from('search_attempts').update({ status: 'failed', error_message: 'Unable to download Apify dataset.', completed_at: new Date().toISOString() }).eq('order_id', order.id).eq('apify_run_id', runId ?? '');
    await admin.from('orders').update({ status: 'ready_for_search', error_message: 'Unable to download the search result. Your attempt remains counted; use another attempt if available.' }).eq('id', order.id).eq('status', 'processing');
    return NextResponse.json({ error: 'Unable to download dataset' }, { status: 502 });
  }

  const raw = await res.json();
  const currentRows = extractDatasetRows(raw);
  const basePath = `${order.user_id}/${order.id}`;
  const partialPath = `${basePath}/partial.json`;
  let previousRows: LeadObject[] = [];
  const previousDownload = await admin.storage.from('lead-files').download(partialPath);
  if (!previousDownload.error && previousDownload.data) {
    try { previousRows = JSON.parse(await previousDownload.data.text()) as LeadObject[]; } catch { previousRows = []; }
  }

  const purchased = order.original_requested_count ?? order.requested_count ?? 0;
  const merged = mergeUnique(previousRows, currentRows).slice(0, purchased);
  const remaining = Math.max(purchased - merged.length, 0);
  const rows = merged.map(cleanLead);
  const csvPath = `${basePath}/leads.csv`;
  const xlsxPath = `${basePath}/leads.xlsx`;
  const csvUpload = await admin.storage.from('lead-files').upload(csvPath, Buffer.from(rowsToCsv(rows)), { contentType: 'text/csv', upsert: true });
  const xlsxUpload = await admin.storage.from('lead-files').upload(xlsxPath, rowsToXlsx(rows), { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true });
  if (csvUpload.error || xlsxUpload.error) {
    const message = csvUpload.error?.message || xlsxUpload.error?.message || 'Storage upload failed.';
    await admin.from('search_attempts').update({ status: 'failed', returned_count: currentRows.length, error_message: message, completed_at: new Date().toISOString() }).eq('order_id', order.id).eq('apify_run_id', runId ?? '');
    await admin.from('orders').update({ status: 'ready_for_search', delivered_count: merged.length, remaining_leads: remaining, csv_path: rows.length ? csvPath : null, xlsx_path: rows.length ? xlsxPath : null, error_message: message }).eq('id', order.id).eq('status', 'processing');
    return NextResponse.json({ error: 'Unable to upload lead files' }, { status: 500 });
  }

  await admin.storage.from('lead-files').upload(partialPath, Buffer.from(JSON.stringify(merged)), { contentType: 'application/json', upsert: true });
  await admin.from('search_attempts').update({ status: remaining > 0 ? 'completed_partial' : 'completed', returned_count: currentRows.length, apify_dataset_id: datasetId, completed_at: new Date().toISOString() }).eq('order_id', order.id).eq('apify_run_id', runId ?? '');

  if (remaining > 0) {
    // IMPORTANT: do not automatically launch another Apify run. The customer gets exactly three total attempts.
    await admin.from('orders').update({ status: 'ready_for_search', delivered_count: merged.length, remaining_leads: remaining, requested_count: remaining, apify_dataset_id: datasetId, csv_path: csvPath, xlsx_path: xlsxPath, completed_at: new Date().toISOString(), error_message: `${merged.length.toLocaleString('en-US')} of ${purchased.toLocaleString('en-US')} leads found. ${remaining.toLocaleString('en-US')} leads remain locked for your next search attempt.` }).eq('id', order.id).eq('status', 'processing');
    return NextResponse.json({ ok: true, status: 'partial', delivered: merged.length, remaining, attemptsRemaining: Math.max((order.max_customer_attempts ?? 3) - 1, 0) });
  }

  await admin.storage.from('lead-files').remove([partialPath]);
  await admin.from('orders').update({ status: 'completed', delivered_count: rows.length, remaining_leads: 0, requested_count: 0, apify_dataset_id: datasetId, csv_path: csvPath, xlsx_path: xlsxPath, completed_at: new Date().toISOString(), error_message: null }).eq('id', order.id).eq('status', 'processing');

  let emailSent = false; let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    const [csvLink, xlsxLink] = await Promise.all([
      admin.storage.from('lead-files').createSignedUrl(csvPath, 60 * 60 * 24 * 7),
      admin.storage.from('lead-files').createSignedUrl(xlsxPath, 60 * 60 * 24 * 7),
    ]);
    try {
      await sendCompletionEmail({ to: order.delivery_email, orderCode: order.order_code, deliveredCount: rows.length, csvUrl: csvLink.data?.signedUrl, xlsxUrl: xlsxLink.data?.signedUrl });
      emailSent = true;
    } catch (error) { emailError = error instanceof Error ? error.message : 'Completion email failed.'; }
  } else emailError = 'RESEND_API_KEY is not configured.';

  return NextResponse.json({ ok: true, status: 'completed', delivered: rows.length, remaining: 0, emailSent, emailError });
}
