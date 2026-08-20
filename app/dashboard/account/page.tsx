import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { DashboardShell } from '@/components/DashboardShell';
import { createServerSupabase } from '@/lib/supabase/server';

async function updateAccount(formData: FormData) {
  'use server';
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/account');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email || email === user.email?.toLowerCase()) redirect('/dashboard/account');
  await supabase.auth.updateUser({ email });
  revalidatePath('/dashboard/account');
  redirect('/dashboard/account?updated=1');
}

async function signOut() {
  'use server';
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/auth');
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/account');

  const { data: profile } = await supabase.from('profiles').select('email,role,created_at,updated_at').eq('id', user.id).single();

  return (
    <DashboardShell active="Account">
      <div className="topbar">
        <div><h1 style={{ margin: 0 }}>Account</h1><p className="muted">Manage the account connected to your Leadmech workspace.</p></div>
      </div>

      {params.updated && <div className="card" style={{ marginTop: 18, borderColor: 'rgba(34,197,94,.35)' }}>A confirmation email may be required before the new address becomes active.</div>}

      <div className="card" style={{ marginTop: 22 }}>
        <h2>Profile</h2>
        <div className="form-grid">
          <div className="field"><label>Email</label><input value={profile?.email ?? user.email ?? ''} readOnly /></div>
          <div className="field"><label>Role</label><input value={profile?.role ?? 'customer'} readOnly /></div>
          <div className="field"><label>Account created</label><input value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB') : '-'} readOnly /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Change email</h2>
        <form action={updateAccount} className="form-grid">
          <div className="field full"><label>New email address</label><input name="email" type="email" required placeholder="you@example.com" /></div>
          <div className="full form-actions"><button className="btn btn-primary" type="submit">Update email</button></div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Session</h2>
        <form action={signOut}><button className="btn btn-secondary" type="submit">Sign out</button></form>
      </div>
    </DashboardShell>
  );
}
