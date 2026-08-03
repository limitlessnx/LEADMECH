import { NextResponse } from 'next/server';
import { cleanLead } from '@/lib/clean-leads';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCompletionEmail } from '@/lib/email';
import { rowsToCsv, rowsToXlsx } from '@/lib/export-files';
import { getSiteUrl } from '@/lib/site';

type ApifyEvent = {
  orderId?: string;
  eventType?: string;
  resource?: { id?: string; status?: string; defaultDatasetId?: string };
};

type LeadObject = Record<string, unknown>;

const RELAXATION_STEPS = [
  { key: 'companyIndustryIncludes', label: 'company industry' },
  { key: 'companyLocationCityIncludes', label: 'company city' },
  { key: 'companyLocationStateIncludes', label: 'company state' },
  { key: 'personLocationCityIncludes', label: 'person city' },
  { key: 'personLocationStateIncludes', label: 'person state' },
  { key: 'companySizeIncludes', label: 'company size' },
  { key: 'seniorityIncludes', label: 'seniority' },
  { key: 'emailStatusIncludes', label: 'strict email status' },
  { key: 'emailStatusExcludes', label: 'strict email exclusion' },
  { key: 'personTitleIncludes', label: 'exact job title' },
] as const;

function isLeadRecord(value: unknown): value is LeadObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as LeadObject;
  if (row.recordType === 'diagnostic' || row.rowType === 'diagnostic' || row.status === 'no_results') return false;
  const identityFields = [row.email, row.fullName, row.firstName, row.lastName, row.linkedinUrl, row.companyName, row.companyDomain];
  return identityFields.some((field) => typeof field === 'string' && field.trim().length > 0);
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

function extractDatasetRows(value: unknown) {
  return allDatasetObjects(value).filter(isLeadRecord);
}

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
  const seen = new Set<string>();
  const merged: LeadObject[] = [];
  for (const row of groups.flat()) {
    const key = leadKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}

function nextRelaxedInput(current: Record<string, unknown>, remaining: number) {
  const next = { ...current, totalResults: remaining };
  for (const step of RELAXATION_STEPS) {
    const value = next[step.key];
    const active = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
    if (active) {
      delete next[step.key];
      if (step.key === 'emailStatusIncludes') delete next.emailStatusExcludes;
      if (step.key === 'emailStatusExcludes') delete next.emailStatusIncludes;
      return { input: next, removed: step.label };
    }
  }
  return null;
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

async function startExpandedRun(orderId: string, input: Record<string, unknown>, token: string) {
  const actorId = process.env.APIFY_ACTOR_ID;
  if (!actorId) throw new Error('Apify actor is not configured.');
  const webhooks = actorWebhooks(orderId);
  const response = await fetch(`https://api.apify.com/v2/actors/${actorId}/runs?waitForFinish=0&webhooks=${encodeURIComponent(webhooks)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.data?.id) throw new Error(data?.error?.message || data?.message || 'Unable to start expanded Apify search.');
  return data.data as { id: string; defaultDatasetId?: string };
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const configuredSecret = process.env.APIFY_WEBHOOK_SECRET;
  if (configuredSecret && url.searchParams.get('secret') !== configuredSecret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  const event = await request.json() as ApifyEvent;
  const admin = createAdminClient();
  const runId = event.resource?.id;
  const orderId = event.orderId;
  const datasetId = event.resource?.defaultDatasetId;
  const status = event.resource?.status || event.eventType || 'UNKNOWN';

  const orderQuery = admin.from('orders').select('id,user_id,order_code,requested_count,delivery_email,apify_run_id,apify_input,search_filters').limit(1);
  const { data: orders, error: orderError } = orderId
    ? await orderQuery.eq('id', orderId)
    : await orderQuery.eq('apify_run_id', runId ?? '');
  const order = orders?.[0];
  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (!status.includes('SUCCEEDED') && status !== 'SUCCEEDED') {
    await admin.from('orders').update({ status: 'failed', error_message: `Apify run ended as ${status}` }).eq('id', order.id);
    return NextResponse.json({ ok: true, status });
  }
  if (!datasetId) return NextResponse.json({ error: 'Missing dataset ID' }, { status: 400 });

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'Apify token is not configured' }, { status: 500 });
  const limit = order.requested_count ?? 50000;
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&limit=${limit}`, {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!res.ok) {
    await admin.from('orders').update({ status: 'failed', error_message: 'Unable to download Apify dataset.' }).eq('id', order.id);
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

  const merged = mergeUnique(previousRows, currentRows).slice(0, limit);
  const remaining = Math.max(limit - merged.length, 0);
  const currentInput = (order.apify_input && typeof order.apify_input === 'object' ? order.apify_input : {}) as Record<string, unknown>;
  const relaxed = remaining > 0 ? nextRelaxedInput(currentInput, remaining) : null;

  if (remaining > 0 && relaxed) {
    await admin.storage.from('lead-files').upload(partialPath, Buffer.from(JSON.stringify(merged)), {
      contentType: 'application/json', upsert: true,
    });
    try {
      const run = await startExpandedRun(order.id, relaxed.input, token);
      const filters = order.search_filters && typeof order.search_filters === 'object' ? order.search_filters as Record<string, unknown> : {};
      const removed = Array.isArray(filters._expandedFilters) ? filters._expandedFilters : [];
      await admin.from('orders').update({
        status: 'processing',
        delivered_count: merged.length,
        apify_run_id: run.id,
        apify_dataset_id: run.defaultDatasetId ?? null,
        apify_input: relaxed.input,
        search_filters: { ...filters, _expandedFilters: [...removed, relaxed.removed] },
        error_message: `Found ${merged.length.toLocaleString('en-US')} of ${limit.toLocaleString('en-US')} leads. Expanding beyond ${relaxed.removed} to complete the order.`,
      }).eq('id', order.id);
      return NextResponse.json({ ok: true, status: 'expanding', rows: merged.length, remaining, removedFilter: relaxed.removed });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue expanded search.';
      await admin.from('orders').update({ status: 'failed', delivered_count: merged.length, error_message: message }).eq('id', order.id);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (merged.length === 0) {
    const message = diagnosticMessage(raw) || 'No leads matched even after the available filters were broadened.';
    await admin.from('orders').update({
      status: 'no_results', delivered_count: 0, apify_dataset_id: datasetId,
      csv_path: null, xlsx_path: null, completed_at: null, error_message: message,
    }).eq('id', order.id);
    await admin.storage.from('lead-files').remove([partialPath]);
    return NextResponse.json({ ok: false, status: 'no_results', rows: 0, error: message });
  }

  const finalLeadObjects = merged.slice(0, limit);
  const rows = finalLeadObjects.map(cleanLead);
  const csvPath = `${basePath}/leads.csv`;
  const xlsxPath = `${basePath}/leads.xlsx`;
  const csvUpload = await admin.storage.from('lead-files').upload(csvPath, Buffer.from(rowsToCsv(rows)), { contentType: 'text/csv', upsert: true });
  const xlsxUpload = await admin.storage.from('lead-files').upload(xlsxPath, rowsToXlsx(rows), { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true });
  if (csvUpload.error || xlsxUpload.error) {
    const message = csvUpload.error?.message || xlsxUpload.error?.message || 'Storage upload failed.';
    await admin.from('orders').update({ status: 'failed', error_message: message }).eq('id', order.id);
    return NextResponse.json({ error: 'Unable to upload lead files' }, { status: 500 });
  }

  await admin.storage.from('lead-files').remove([partialPath]);
  const shortfall = rows.length < limit ? ` Delivered ${rows.length.toLocaleString('en-US')} unique leads after all safe expansion stages.` : null;
  await admin.from('orders').update({
    status: 'completed', apify_dataset_id: datasetId, delivered_count: rows.length,
    csv_path: csvPath, xlsx_path: xlsxPath, completed_at: new Date().toISOString(), error_message: shortfall,
  }).eq('id', order.id);

  let emailSent = false;
  let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    const [csvLink, xlsxLink] = await Promise.all([
      admin.storage.from('lead-files').createSignedUrl(csvPath, 60 * 60 * 24 * 7),
      admin.storage.from('lead-files').createSignedUrl(xlsxPath, 60 * 60 * 24 * 7),
    ]);
    try {
      await sendCompletionEmail({ to: order.delivery_email, orderCode: order.order_code, deliveredCount: rows.length, csvUrl: csvLink.data?.signedUrl, xlsxUrl: xlsxLink.data?.signedUrl });
      emailSent = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Completion email failed.';
      console.error('Leadmech completion email failed', emailError);
    }
  } else {
    emailError = 'RESEND_API_KEY is not configured.';
  }

  return NextResponse.json({ ok: true, rows: rows.length, requested: limit, emailSent, emailError, shortfall });
}
