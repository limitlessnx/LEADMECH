import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function Admin() {
  const { admin } = await requireAdmin();

  const [{ data: orders }, { data: users }] = await Promise.all([
    admin.from('orders').select('id,status,payment_status,requested_count,delivered_count,created_at,completed_at,packages(price_usd)'),
    admin.from('profiles').select('id,email,role,created_at'),
  ]);

  const rows = orders ?? [];
  const revenue = rows.reduce((sum, order) => {
    const price = Array.isArray(order.packages) ? order.packages[0]?.price_usd : order.packages?.price_usd;
    return ['paid','ready_for_search','processing','no_results','completed'].includes(order.status)
      ? sum + Number(price ?? 0)
      : sum;
  }, 0);
  const totalDelivered = rows.reduce((sum, order) => sum + Number(order.delivered_count ?? 0), 0);
  const processing = rows.filter((order) => order.status === 'processing').length;
  const failed = rows.filter((order) => order.status === 'failed').length;
  const completed = rows.filter((order) => order.status === 'completed').length;

  return (
    <DashboardShell active="Admin">
      <div className="topbar">
        <div><h1 style={{ margin: 0 }}>Leadmech Admin</h1><p className="muted">Business operations, customer orders, search runs, and files.</p></div>
        <Link className="btn btn-primary" href="/admin/runs">Open runs</Link>
      </div>
      <AdminNav active="Overview" />
      <div className="dashboard-grid">
        <div className="metric"><span className="muted">Revenue</span><strong>${revenue.toLocaleString('en-US')}</strong></div>
        <div className="metric"><span className="muted">Users</span><strong>{users?.length ?? 0}</strong></div>
        <div className="metric"><span className="muted">Orders</span><strong>{rows.length}</strong></div>
        <div className="metric"><span className="muted">Leads delivered</span><strong>{totalDelivered.toLocaleString('en-US')}</strong></div>
        <div className="metric"><span className="muted">Processing</span><strong>{processing}</strong></div>
        <div className="metric"><span className="muted">Completed</span><strong>{completed}</strong></div>
        <div className="metric"><span className="muted">Failed</span><strong>{failed}</strong></div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <h2>Operations</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
          <Link className="card" href="/admin/orders"><strong>Orders</strong><p className="muted">Purchases, payments, status, and customer details.</p></Link>
          <Link className="card" href="/admin/runs"><strong>Search runs</strong><p className="muted">Apify runs, datasets, filters, progress, and errors.</p></Link>
          <Link className="card" href="/admin/users"><strong>Users</strong><p className="muted">Accounts, roles, order totals, and customer activity.</p></Link>
          <Link className="card" href="/admin/files"><strong>Files</strong><p className="muted">CSV and Excel delivery files with expiry tracking.</p></Link>
        </div>
      </div>
    </DashboardShell>
  );
}
