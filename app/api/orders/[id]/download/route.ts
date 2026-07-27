import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const { data: order } = await supabase
    .from('orders')
    .select('csv_path,xlsx_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .single();

  const path = format === 'xlsx' ? order?.xlsx_path : order?.csv_path;
  if (!path) return NextResponse.json({ error: 'File is not available.' }, { status: 404 });

  const { data, error } = await supabase.storage.from('lead-files').createSignedUrl(path, 3600, { download: true });
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Unable to create download link.' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
