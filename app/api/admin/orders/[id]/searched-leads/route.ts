import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanLead } from '@/lib/clean-leads';
import { rowsToCsv, rowsToXlsx } from '@/lib/export-files';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const format = new URL(request.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const admin = createAdminClient();
  const { data: order } = await admin.from('orders').select('id,order_code,apify_dataset_id,requested_count').eq('id', id).single();
  if (!order?.apify_dataset_id) return NextResponse.json({ error: 'No Apify dataset is recorded for this order.' }, { status: 404 });

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'Apify is not configured.' }, { status: 503 });
  const limit = Number(order.requested_count ?? 50000);
  const response = await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(order.apify_dataset_id)}/items?clean=true&format=json&limit=${limit}`, {
    headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!response.ok) return NextResponse.json({ error: 'Unable to retrieve the searched leads from Apify.' }, { status: 502 });
  const raw = await response.json();
  const objects = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.results) ? raw.results : [];
  const rows = objects.filter((row: unknown) => row && typeof row === 'object').filter((row: Record<string, unknown>) => {
    if (row.recordType === 'diagnostic' || row.rowType === 'diagnostic' || row.status === 'no_results') return false;
    return [row.email, row.fullName, row.firstName, row.lastName, row.linkedinUrl, row.companyName, row.companyDomain].some((v) => typeof v === 'string' && v.trim());
  }).map(cleanLead);

  const body = format === 'xlsx' ? rowsToXlsx(rows) : Buffer.from(rowsToCsv(rows));
  const contentType = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8';
  const extension = format === 'xlsx' ? 'xlsx' : 'csv';
  return new NextResponse(body as BodyInit, {
    headers: {
      'content-type': contentType,
      'content-disposition': `attachment; filename="${order.order_code}-searched-leads.${extension}"`,
      'cache-control': 'no-store',
    },
  });
}
