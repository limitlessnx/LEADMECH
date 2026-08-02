import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/site';

type CookieToSet = { name: string; value: string; options: CookieOptions };

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
  let confirmPassword = '';
  let next = '/dashboard';
  let isFormPost = false;

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    isFormPost = true;
    const form = await request.formData();
    email = String(form.get('email') ?? '').trim().toLowerCase();
    password = String(form.get('password') ?? '');
    confirmPassword = String(form.get('confirmPassword') ?? '');
    next = safeNext(String(form.get('next') ?? '/dashboard'));
  } else {
    const body = await request.json().catch(() => null);
    email = String(body?.email ?? '').trim().toLowerCase();
    password = String(body?.password ?? '');
    confirmPassword = String(body?.confirmPassword ?? '');
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
  if (password !== confirmPassword) return respondError('Passwords do not match. Enter the same password twice.', 400);

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

  const response = isFormPost
    ? NextResponse.redirect(new URL(next, request.url), 303)
    : NextResponse.json({ created: true, redirectTo: next });

  const requestCookieHeader = request.headers.get('cookie') || '';
  const requestCookies = requestCookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      return separator === -1
        ? { name: part, value: '' }
        : { name: part.slice(0, separator), value: decodeURIComponent(part.slice(separator + 1)) };
    });

  const supabase = createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return requestCookies;
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const signInResult = await supabase.auth.signInWithPassword({ email, password });
  if (signInResult.error) return respondError(signInResult.error.message, 400);

  return response;
}
