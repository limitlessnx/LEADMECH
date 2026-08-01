'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setSuccess(false);

    if (password.length < 6) {
      setMessage('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase();
    const result = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setSuccess(true);
    setMessage('Your password has been updated. Redirecting to your dashboard...');
    window.setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 800);
  };

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: 28 }}>
      <h1>Create a new password</h1>
      <p className="muted">Choose a new password for your Leadmech account.</p>
      <div className="field">
        <label>New password</label>
        <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Enter a new password" />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label>Confirm new password</label>
        <input required minLength={6} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Repeat the new password" />
      </div>
      {message && <p className={success ? 'muted' : 'error-text'}>{message}</p>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
        {loading ? 'Updating password...' : 'Update password'}
      </button>
    </form>
  );
}
