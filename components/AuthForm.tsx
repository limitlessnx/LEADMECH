'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/browser';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const next = params.get('next') || '/dashboard';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createBrowserSupabase();

    if (mode === 'sign-up') {
      const signupResponse = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        setLoading(false);
        setMessage(signupData.error || 'Unable to create account.');
        return;
      }
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

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: 28 }}>
      <h1>{mode === 'sign-in' ? 'Welcome back' : 'Create account'}</h1>
      <p className="muted">Sign in to purchase searches and access saved files.</p>
      <div className="field">
        <label>Email</label>
        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label>Password</label>
        <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />
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
        }}
      >
        {mode === 'sign-in' ? 'New here? Create an account.' : 'Already have an account? Sign in.'}
      </button>
    </form>
  );
}
