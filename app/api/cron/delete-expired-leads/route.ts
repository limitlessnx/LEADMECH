import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FILE_RETENTION_DAYS = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiredOrders, error } = await admin
    .from('orders')
    .select('id,csv_path,xlsx_path')
    .eq('status', 'completed')
    .lt('completed_at', cutoff)
    .or('csv_path.not.is.null,xlsx_path.not.is.null');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let deletedFiles = 0;
  for (const order of expiredOrders ?? []) {
    const paths = [order.csv_path, order.xlsx_path].filter((path): path is string => Boolean(path));
    if (paths.length) {
      const { error: storageError } = await admin.storage.from('lead-files').remove(paths);
      if (storageError) continue;
      deletedFiles += paths.length;
    }

    await admin
      .from('orders')
      .update({ csv_path: null, xlsx_path: null })
      .eq('id', order.id);
  }

  return NextResponse.json({ ok: true, expiredOrders: expiredOrders?.length ?? 0, deletedFiles });
}
