import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeNext(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
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

  const contentType = request.headers.get('content-type') || '';
  let email = '';
  let password = '';
  let next = '/dashboard';
  let isFormPost = false;

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    isFormPost = true;
    const form = await request.formData();
    email = String(form.get('email') ?? '').trim().toLowerCase();
    password = String(form.get('password') ?? '');
    next = safeNext(String(form.get('next') ?? '/dashboard'));
  } else {
    const body = await request.json().catch(() => null);
    email = String(body?.email ?? '').trim().toLowerCase();
    password = String(body?.password ?? '');
    next = safeNext(String(body?.next ?? '/dashboard'));
  }

  const respondError = (message: string, status: number) => {
    if (isFormPost) {
      const url = new URL('/auth', request.url);
      url.searchParams.set('mode', 'sign-up');
      url.searchParams.set('error', message);
      url.searchParams.set('next', next);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error: message }, { status });
  };

  if (!isValidEmail(email)) return respondError('Enter a valid email address.', 400);
  if (password.length < 6) return respondError('Password must contain at least 6 characters.', 400);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const duplicate = /already.*registered|already.*exists|email.*exists/i.test(error.message);
    return respondError(
      duplicate ? 'An account already exists with this email. Sign in instead.' : error.message,
      duplicate ? 409 : 400,
    );
  }

  const supabase = await createServerSupabase();
  const signInResult = await supabase.auth.signInWithPassword({ email, password });
  if (signInResult.error) return respondError(signInResult.error.message, 400);

  if (isFormPost) return NextResponse.redirect(new URL(next, request.url), 303);
  return NextResponse.json({ created: true, redirectTo: next });
}
