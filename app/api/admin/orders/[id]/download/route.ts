import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const format = new URL(request.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const admin = createAdminClient();
  const { data: order } = await admin.from('orders').select('csv_path,xlsx_path').eq('id', id).single();
  const path = format === 'xlsx' ? order?.xlsx_path : order?.csv_path;
  if (!path) return NextResponse.json({ error: 'File is unavailable.' }, { status: 404 });

  const { data, error } = await admin.storage.from('lead-files').createSignedUrl(path, 3600, { download: true });
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Unable to create download link.' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
