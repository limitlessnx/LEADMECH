'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMode: Mode = params.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(params.get('error') || '');
  const [loading, setLoading] = useState(false);

  const next = params.get('next') || '/dashboard';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    if (mode === 'sign-up') {
      setLoading(true);
      return;
    }

    event.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createBrowserSupabase();
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    router.push(next);
    router.refresh();
  };

  return (
    <form
      onSubmit={submit}
      action={mode === 'sign-up' ? '/api/auth/sign-up' : undefined}
      method={mode === 'sign-up' ? 'post' : undefined}
      className="card"
      style={{ marginTop: 28 }}
    >
      <h1>{mode === 'sign-in' ? 'Welcome back' : 'Create account'}</h1>
      <p className="muted">Sign in to purchase searches and access saved files.</p>
      {mode === 'sign-up' && <input type="hidden" name="next" value={next} />}
      <div className="field">
        <label>Email</label>
        <input required name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label>Password</label>
        <input required name="password" minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />
      </div>
      {message && <p className="error-text">{message}</p>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
        {loading ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button"
        className="link-button"
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 0,
          color: 'var(--accent)',
          cursor: 'pointer',
          display: 'block',
          fontWeight: 800,
          lineHeight: 1.35,
          marginTop: 18,
          padding: '12px 8px',
          textAlign: 'center',
          width: '100%',
        }}
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          setMessage('');
          setLoading(false);
        }}
      >
        {mode === 'sign-in' ? 'New here? Create an account.' : 'Already have an account? Sign in.'}
      </button>
    </form>
  );
}
