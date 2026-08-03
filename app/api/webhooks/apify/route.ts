import { NextResponse } from 'next/server';
import { cleanLead } from '@/lib/clean-leads';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCompletionEmail } from '@/lib/email';
import { rowsToCsv, rowsToXlsx } from '@/lib/export-files';

type ApifyEvent = {
  orderId?: string;
  eventType?: string;
  resource?: { id?: string; status?: string; defaultDatasetId?: string };
};

function isLeadRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (row.recordType === 'diagnostic' || row.rowType === 'diagnostic' || row.status === 'no_results') return false;
  const identityFields = [row.email, row.fullName, row.firstName, row.lastName, row.linkedinUrl, row.companyName, row.companyDomain];
  return identityFields.some((field) => typeof field === 'string' && field.trim().length > 0);
}

function allDatasetObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  for (const candidate of [object.items, object.data, object.results, object.leads]) {
    if (Array.isArray(candidate)) return candidate.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
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
  const counterfactuals = Array.isArray(diagnostic['f - counterfactualLeads'])
    ? diagnostic['f - counterfactualLeads'] as Array<Record<string, unknown>>
    : [];
  const alternatives = counterfactuals
    .filter((item) => typeof item.remove_filter === 'string' && typeof item.results === 'number')
    .slice(0, 3)
    .map((item) => `Remove ${String(item.remove_filter)}: about ${Number(item.results).toLocaleString('en-US')} matches`);

  return [why, suggestion, ...alternatives].filter(Boolean).join(' ');
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

  const orderQuery = admin.from('orders').select('id,user_id,order_code,requested_count,delivery_email,apify_run_id').limit(1);
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
    headers: { authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await admin.from('orders').update({ status: 'failed', error_message: 'Unable to download Apify dataset.' }).eq('id', order.id);
    return NextResponse.json({ error: 'Unable to download dataset' }, { status: 502 });
  }

  const raw = await res.json();
  const leadRecords = extractDatasetRows(raw).slice(0, limit);

  if (leadRecords.length === 0) {
    const message = diagnosticMessage(raw) || 'No leads matched all selected filters. Remove one restrictive filter and try again.';
    await admin.from('orders').update({
      status: 'no_results',
      delivered_count: 0,
      apify_dataset_id: datasetId,
      csv_path: null,
      xlsx_path: null,
      completed_at: null,
      error_message: message,
    }).eq('id', order.id);
    return NextResponse.json({ ok: false, status: 'no_results', rows: 0, error: message }, { status: 200 });
  }

  const rows = leadRecords.map(cleanLead);
  const xlsx = rowsToXlsx(rows);
  const csv = rowsToCsv(rows);
  const basePath = `${order.user_id}/${order.id}`;
  const csvPath = `${basePath}/leads.csv`;
  const xlsxPath = `${basePath}/leads.xlsx`;

  const csvUpload = await admin.storage.from('lead-files').upload(csvPath, Buffer.from(csv), { contentType: 'text/csv', upsert: true });
  const xlsxUpload = await admin.storage.from('lead-files').upload(xlsxPath, xlsx, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true });

  if (csvUpload.error || xlsxUpload.error) {
    await admin.from('orders').update({ status: 'failed', error_message: csvUpload.error?.message || xlsxUpload.error?.message || 'Storage upload failed.' }).eq('id', order.id);
    return NextResponse.json({ error: 'Unable to upload lead files' }, { status: 500 });
  }

  await admin.from('orders').update({
    status: 'completed', apify_dataset_id: datasetId, delivered_count: rows.length,
    csv_path: csvPath, xlsx_path: xlsxPath, completed_at: new Date().toISOString(), error_message: null,
  }).eq('id', order.id);

  let emailSent = false;
  let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    const [csvLink, xlsxLink] = await Promise.all([
      admin.storage.from('lead-files').createSignedUrl(csvPath, 60 * 60 * 24 * 7),
      admin.storage.from('lead-files').createSignedUrl(xlsxPath, 60 * 60 * 24 * 7),
    ]);
    try {
      await sendCompletionEmail({
        to: order.delivery_email,
        orderCode: order.order_code,
        deliveredCount: rows.length,
        csvUrl: csvLink.data?.signedUrl,
        xlsxUrl: xlsxLink.data?.signedUrl,
      });
      emailSent = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Completion email failed.';
      console.error('Leadmech completion email failed', emailError);
    }
  } else {
    emailError = 'RESEND_API_KEY is not configured.';
    console.error('Leadmech completion email skipped: RESEND_API_KEY is not configured.');
  }

  return NextResponse.json({ ok: true, rows: rows.length, emailSent, emailError });
}
