import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const FILE_RETENTION_DAYS = 30;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const { data: order } = await supabase
    .from('orders')
    .select('csv_path,xlsx_path,completed_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .single();

  if (!order?.completed_at) return NextResponse.json({ error: 'File is not available.' }, { status: 404 });

  const expiresAt = new Date(order.completed_at).getTime() + FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() >= expiresAt) {
    return NextResponse.json({ error: 'This lead file has expired after 30 days.' }, { status: 410 });
  }

  const path = format === 'xlsx' ? order.xlsx_path : order.csv_path;
  if (!path) return NextResponse.json({ error: 'File is not available.' }, { status: 404 });

  const { data, error } = await supabase.storage.from('lead-files').createSignedUrl(path, 3600, { download: true });
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Unable to create download link.' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
