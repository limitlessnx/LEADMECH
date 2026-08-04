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
    .select('id,order_code,status,requested_count,delivered_count,delivery_email,search_filters,csv_path,xlsx_path,error_message,created_at,paid_at,started_at,completed_at,packages(id,name,lead_count,price_usd)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<OrderWithPackage[]>();

  const rows = orders ?? [];
  const totalLeads = rows.reduce((sum, order) => sum + (order.requested_count ?? order.packages?.lead_count ?? 0), 0);
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
              {rows.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_code}</td>
                  <td>{(order.requested_count ?? order.packages?.lead_count ?? 0).toLocaleString('en-GB')}</td>
                  <td><span className={`status ${order.status}`}>{order.status.replaceAll('_', ' ')}</span></td>
                  <td>{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                  <td><div className="table-actions">{order.status === 'completed' ? <><Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=csv`}>CSV</Link><Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=xlsx`}>Excel</Link></> : order.status === 'no_results' ? <Link className="btn btn-secondary" href={`/search?order=${order.id}`}>Adjust filters</Link> : order.status === 'ready_for_search' || order.status === 'paid' ? <Link className="btn btn-secondary" href={`/search?order=${order.id}`}>Start</Link> : '-'}</div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5}>No orders yet. Choose a package to begin.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
