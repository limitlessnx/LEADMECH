import { NextResponse } from 'next/server';
import { cleanLead } from '@/lib/clean-leads';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCompletionEmail } from '@/lib/email';
import { rowsToCsv, rowsToXlsx } from '@/lib/export-files';

type ApifyEvent = {
  orderId?: string;
  eventType?: string;
  resource?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
  };
};

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

  const orderQuery = admin
    .from('orders')
    .select('id,user_id,order_code,requested_count,delivery_email,apify_run_id')
    .limit(1);

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
  const rows = raw.slice(0, limit).map(cleanLead);
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

  await admin
    .from('orders')
    .update({
      status: 'completed',
      apify_dataset_id: datasetId,
      delivered_count: rows.length,
      csv_path: csvPath,
      xlsx_path: xlsxPath,
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', order.id);

  if (process.env.RESEND_API_KEY) {
    await sendCompletionEmail({ to: order.delivery_email, orderCode: order.order_code, deliveredCount: rows.length });
  }

  return NextResponse.json({ ok: true, rows: rows.length });
}
