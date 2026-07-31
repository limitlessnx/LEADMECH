import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must contain at least 6 characters.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const duplicate = /already.*registered|already.*exists|email.*exists/i.test(error.message);
    return NextResponse.json(
      { error: duplicate ? 'An account already exists with this email. Sign in instead.' : error.message },
      { status: duplicate ? 409 : 400 },
    );
  }

  return NextResponse.json({ created: true, userId: data.user.id });
}
