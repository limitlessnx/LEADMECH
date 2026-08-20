import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { DashboardShell } from '@/components/DashboardShell';
import { createServerSupabase } from '@/lib/supabase/server';

type Template = { id: string; name: string; filters: Record<string, unknown>; created_at: string; updated_at: string };

async function createTemplate(formData: FormData) {
  'use server';
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/templates');

  const name = String(formData.get('name') ?? '').trim();
  const filtersText = String(formData.get('filters') ?? '{}').trim();
  if (!name) redirect('/dashboard/templates');

  let filters: unknown;
  try { filters = JSON.parse(filtersText); } catch { redirect('/dashboard/templates?error=invalid-json'); }
  await supabase.from('saved_templates').insert({ user_id: user.id, name, filters });
  revalidatePath('/dashboard/templates');
  redirect('/dashboard/templates');
}

async function deleteTemplate(formData: FormData) {
  'use server';
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/templates');
  const id = String(formData.get('id') ?? '').trim();
  if (id) await supabase.from('saved_templates').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/dashboard/templates');
  redirect('/dashboard/templates');
}

export default async function SavedTemplatesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/templates');

  const { data: templates } = await supabase
    .from('saved_templates')
    .select('id,name,filters,created_at,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .returns<Template[]>();

  return (
    <DashboardShell active="Saved Templates">
      <div className="topbar">
        <div><h1 style={{ margin: 0 }}>Saved Templates</h1><p className="muted">Reusable targeting filters for your next lead search.</p></div>
        <Link className="btn btn-primary" href="/search">New search</Link>
      </div>

      {params.error && <div className="card" style={{ marginTop: 18, borderColor: 'rgba(245,158,11,.45)' }}><strong>Template could not be saved.</strong><p className="muted">Check that the filter data is valid JSON.</p></div>}

      <div className="card" style={{ marginTop: 22 }}>
        <h2>Create template</h2>
        <form action={createTemplate} className="form-grid">
          <div className="field"><label>Name</label><input name="name" required placeholder="US project managers" /></div>
          <div className="field full"><label>Filters JSON</label><textarea name="filters" required rows={6} defaultValue="{}" placeholder='{"companyCountries":"United States","jobTitles":"Project Manager"}' /></div>
          <div className="full form-actions"><button className="btn btn-primary" type="submit">Save template</button></div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Your templates</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Filters</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>
              {(templates ?? []).map((template) => (
                <tr key={template.id}>
                  <td><strong>{template.name}</strong></td>
                  <td><code style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(template.filters)}</code></td>
                  <td>{new Date(template.updated_at).toLocaleDateString('en-GB')}</td>
                  <td><div className="table-actions"><Link className="btn btn-primary" href={`/search?template=${template.id}`}>Use template</Link><form action={deleteTemplate}><input type="hidden" name="id" value={template.id} /><button className="btn btn-secondary" type="submit">Delete</button></form></div></td>
                </tr>
              ))}
              {!(templates ?? []).length && <tr><td colSpan={4}>No saved templates yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
