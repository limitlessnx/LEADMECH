'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password';

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMode: Mode = params.get('mode') === 'sign-up'
    ? 'sign-up'
    : params.get('mode') === 'forgot-password'
      ? 'forgot-password'
      : 'sign-in';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(params.get('error') || '');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const next = params.get('next') || '/dashboard';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    if (mode === 'sign-up') {
      if (password !== confirmPassword) {
        event.preventDefault();
        setMessage('Passwords do not match. Enter the same password twice.');
        setSuccess(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      return;
    }

    event.preventDefault();
    setLoading(true);
    setMessage('');
    setSuccess(false);

    const supabase = createBrowserSupabase();

    if (mode === 'forgot-password') {
      const redirectTo = `${window.location.origin}/reset-password`;
      const result = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      setLoading(false);

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setSuccess(true);
      setMessage('Password reset instructions have been sent if an account exists for this email.');
      return;
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    router.push(next);
    router.refresh();
  };

  const title = mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Create account' : 'Reset your password';
  const description = mode === 'forgot-password'
    ? 'Enter your email and we will send you a secure password reset link.'
    : mode === 'sign-up'
      ? 'Enter your password twice so you can confirm it before your account is created.'
      : 'Sign in to purchase searches and access saved files.';

  return (
    <form
      onSubmit={submit}
      action={mode === 'sign-up' ? '/api/auth/sign-up' : undefined}
      method={mode === 'sign-up' ? 'post' : undefined}
      className="card"
      style={{ marginTop: 28 }}
    >
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      {mode === 'sign-up' && <input type="hidden" name="next" value={next} />}
      <div className="field">
        <label>Email</label>
        <input required name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" />
      </div>
      {mode !== 'forgot-password' && (
        <div className="field" style={{ marginTop: 14 }}>
          <label>Password</label>
          <input required name="password" minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />
        </div>
      )}
      {mode === 'sign-up' && (
        <div className="field" style={{ marginTop: 14 }}>
          <label>Confirm password</label>
          <input required name="confirmPassword" minLength={6} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the same password again" autoComplete="new-password" />
        </div>
      )}
      {message && <p className={success ? 'muted' : 'error-text'}>{message}</p>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
        {loading ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}
      </button>

      {mode === 'sign-in' && (
        <button
          type="button"
          className="link-button"
          data-no-global-loading="true"
          style={{ appearance: 'none', background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', display: 'block', fontWeight: 700, marginTop: 14, padding: '8px', textAlign: 'center', width: '100%' }}
          onClick={() => { setMode('forgot-password'); setMessage(''); setSuccess(false); }}
        >
          Forgot your password?
        </button>
      )}

      <button
        type="button"
        className="link-button"
        data-no-global-loading="true"
        style={{ appearance: 'none', background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', display: 'block', fontWeight: 800, lineHeight: 1.35, marginTop: 10, padding: '12px 8px', textAlign: 'center', width: '100%' }}
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          setMessage('');
          setSuccess(false);
          setLoading(false);
          setPassword('');
          setConfirmPassword('');
        }}
      >
        {mode === 'sign-in' ? 'New here? Create an account.' : 'Back to sign in.'}
      </button>
    </form>
  );
}
