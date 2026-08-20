import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { DashboardShell } from '@/components/DashboardShell';
import { createServerSupabase } from '@/lib/supabase/server';
import type { OrderWithPackage } from '@/types/leadmech';

async function saveTemplate(formData: FormData) {
  'use server';
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/orders');

  const name = String(formData.get('name') ?? '').trim();
  const filtersText = String(formData.get('filters') ?? '{}').trim();
  if (!name) redirect('/dashboard/orders');

  let filters: unknown = {};
  try { filters = JSON.parse(filtersText); } catch { redirect('/dashboard/orders?error=invalid-template'); }

  await supabase.from('saved_templates').insert({ user_id: user.id, name, filters });
  revalidatePath('/dashboard/orders');
  revalidatePath('/dashboard/templates');
  redirect('/dashboard/templates');
}

export default async function OrdersPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/orders');

  const { data: orders } = await supabase
    .from('orders')
    .select('id,order_code,status,payment_status,requested_count,original_requested_count,delivered_count,remaining_leads,customer_attempts_used,max_customer_attempts,delivery_email,search_filters,csv_path,xlsx_path,error_message,apify_run_id,created_at,paid_at,started_at,completed_at,packages(id,name,lead_count,price_usd)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<OrderWithPackage[]>();

  return (
    <DashboardShell active="Orders">
      <div className="topbar">
        <div><h1 style={{ margin: 0 }}>Orders</h1><p className="muted">Every purchase, search attempt, delivery and recovery state in one place.</p></div>
        <Link className="btn btn-primary" href="/#pricing">Buy package</Link>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Package</th><th>Payment</th><th>Search</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const purchased = order.original_requested_count ?? order.requested_count ?? order.packages?.lead_count ?? 0;
                const delivered = order.delivered_count ?? 0;
                const remaining = order.remaining_leads ?? Math.max(purchased - delivered, 0);
                const attemptsUsed = order.customer_attempts_used ?? 0;
                const maxAttempts = order.max_customer_attempts ?? 3;
                const paymentConfirmed = ['confirmed', 'finished'].includes(order.payment_status ?? '');
                const canSearch = remaining > 0 && attemptsUsed < maxAttempts && paymentConfirmed && ['paid', 'ready_for_search'].includes(order.status);
                const canRetry = order.status === 'failed' && !order.apify_run_id && remaining > 0 && attemptsUsed < maxAttempts && paymentConfirmed;
                return (
                  <tr key={order.id}>
                    <td><strong>{order.order_code}</strong></td>
                    <td>{order.packages?.name ?? purchased.toLocaleString('en-GB')}</td>
                    <td><span className={`status ${order.payment_status ?? 'pending'}`}>{order.payment_status ?? 'pending'}</span></td>
                    <td><span className={`status ${order.status}`}>{order.status.replaceAll('_', ' ')}</span><br/><small className="muted">{delivered.toLocaleString('en-GB')} / {purchased.toLocaleString('en-GB')} leads</small></td>
                    <td>{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div className="table-actions">
                        {canSearch && <Link className="btn btn-primary" href={`/search?order=${order.id}`}>Start search</Link>}
                        {canRetry && <form action={`/api/orders/${order.id}/rerun`} method="post"><button className="btn btn-primary" type="submit">Retry search</button></form>}
                        {order.csv_path && <Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=csv`}>CSV</Link>}
                        {order.xlsx_path && <Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=xlsx`}>Excel</Link>}
                        {order.status === 'no_results' && <Link className="btn btn-secondary" href={`/search?order=${order.id}`}>Adjust filters</Link>}
                        {order.search_filters && Object.keys(order.search_filters as Record<string, unknown>).length > 0 && (
                          <form action={saveTemplate}>
                            <input type="hidden" name="name" value={`${order.order_code} template`} />
                            <input type="hidden" name="filters" value={JSON.stringify(order.search_filters)} />
                            <button className="btn btn-secondary" type="submit">Save template</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!(orders ?? []).length && <tr><td colSpan={6}>No orders yet. Choose a package to start.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
