import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const admin = createAdminClient();
  const email = `leadmech-health-${Date.now()}@example.com`;
  const password = `Lm!${crypto.randomUUID()}aA1`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error('Supabase auth create-user health check failed:', error?.message);
    return NextResponse.json({ ok: false, stage: 'create-user' }, { status: 503 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error('Supabase auth cleanup failed:', deleteError.message);
    return NextResponse.json({ ok: false, stage: 'cleanup' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, tested: 'create-and-delete-user' });
}
