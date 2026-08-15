import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { createServerSupabase } from '@/lib/supabase/server';
import type { OrderWithPackage } from '@/types/leadmech';

export default async function Dashboard() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.role === 'admin';

  const { data: orders } = await supabase
    .from('orders')
    .select('id,order_code,status,payment_status,requested_count,original_requested_count,delivered_count,remaining_leads,customer_attempts_used,max_customer_attempts,delivery_email,search_filters,csv_path,xlsx_path,error_message,apify_run_id,created_at,paid_at,started_at,completed_at,packages(id,name,lead_count,price_usd)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<OrderWithPackage[]>();

  const rows = orders ?? [];
  const totalLeads = rows.reduce((sum, order) => sum + (order.original_requested_count ?? order.requested_count ?? order.packages?.lead_count ?? 0), 0);
  const completedFiles = rows.filter((order) => order.csv_path || order.xlsx_path).length * 2;

  return (
    <DashboardShell>
      <div className="topbar">
        <div><h1 style={{ margin: 0 }}>Dashboard</h1><p className="muted">Your searches, files, and payment history.</p></div>
        <div className="topbar-actions">
          {isAdmin && <Link className="btn btn-secondary" href="/admin">Switch to Admin</Link>}
          <Link className="btn btn-primary" href="/#pricing">Buy package</Link>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="metric"><span className="muted">Total orders</span><strong>{rows.length}</strong></div>
        <div className="metric"><span className="muted">Leads purchased</span><strong>{totalLeads.toLocaleString('en-GB')}</strong></div>
        <div className="metric"><span className="muted">Completed files</span><strong>{completedFiles}</strong></div>
      </div>
      <div className="card dashboard-table-card" style={{ marginTop: 22 }}>
        <h2>Recent orders</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Package</th><th>Status</th><th>Date</th><th>Files / action</th></tr></thead>
            <tbody>
              {rows.map((order) => {
                const purchased = order.original_requested_count ?? order.requested_count ?? order.packages?.lead_count ?? 0;
                const delivered = order.delivered_count ?? 0;
                const remaining = order.remaining_leads ?? Math.max(purchased - delivered, 0);
                const attemptsUsed = order.customer_attempts_used ?? 0;
                const maxAttempts = order.max_customer_attempts ?? 3;
                const paymentConfirmed = ['confirmed', 'finished'].includes(order.payment_status ?? '');
                const canSearchRemaining = purchased > 0 && remaining > 0 && attemptsUsed < maxAttempts && paymentConfirmed && ['completed', 'no_results'].includes(order.status);
                // A failed order gets exactly one kind of customer retry: only when no
                // Apify run was created. This is a safe recovery for a pre-run validation/
                // provider-start failure, not a retry of an actual Apify run.
                const canRetryFailed = order.status === 'failed' && !order.apify_run_id && remaining > 0 && attemptsUsed < maxAttempts && paymentConfirmed;
                return (
                  <tr key={order.id}>
                    <td>{order.order_code}</td>
                    <td>{purchased.toLocaleString('en-GB')}</td>
                    <td><span className={`status ${order.status}`}>{order.status.replaceAll('_', ' ')}</span></td>
                    <td>{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div className="table-actions">
                        {order.csv_path && <Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=csv`}>CSV</Link>}
                        {order.xlsx_path && <Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=xlsx`}>Excel</Link>}
                        {canSearchRemaining && (
                          <form action={`/api/orders/${order.id}/rerun`} method="post">
                            <button className="btn btn-primary" type="submit">Search remaining leads</button>
                          </form>
                        )}
                        {canRetryFailed && (
                          <form action={`/api/orders/${order.id}/rerun`} method="post">
                            <button className="btn btn-primary" type="submit">Retry search</button>
                          </form>
                        )}
                        {order.status === 'no_results' && <Link className="btn btn-secondary" href={`/search?order=${order.id}`}>Adjust filters</Link>}
                        {(order.status === 'ready_for_search' || order.status === 'paid') && <Link className="btn btn-secondary" href={`/search?order=${order.id}`}>Start</Link>}
                        {order.status === 'failed' && !canRetryFailed && <span className="muted">Search failed after a run started. Contact support.</span>}
                        {!order.csv_path && !order.xlsx_path && !canSearchRemaining && !canRetryFailed && !['no_results', 'ready_for_search', 'paid', 'failed'].includes(order.status) && '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={5}>No orders yet. Choose a package to begin.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
