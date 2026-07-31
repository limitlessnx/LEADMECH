import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (error) {
      console.error('Supabase admin health check failed:', error.message);
      return NextResponse.json({ ok: false, error: 'Supabase admin connection failed.' }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    console.error('Auth health check exception:', message);
    return NextResponse.json({ ok: false, error: 'Auth server configuration failed.' }, { status: 503 });
  }
}
