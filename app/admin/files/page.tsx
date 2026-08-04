import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function AdminFiles() {
  const { admin } = await requireAdmin();
  const { data: orders } = await admin
    .from('orders')
    .select('id,order_code,delivered_count,csv_path,xlsx_path,completed_at,profiles(email)')
    .or('csv_path.not.is.null,xlsx_path.not.is.null')
    .order('completed_at', { ascending: false });

  const now = Date.now();
  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Lead files</h1><p className="muted">Generated CSV and Excel files retained for 30 days.</p></div></div>
      <AdminNav active="Files" />
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Leads</th><th>Completed</th><th>Expires</th><th>Downloads</th></tr></thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                const completed = order.completed_at ? new Date(order.completed_at) : null;
                const expiry = completed ? new Date(completed.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
                const expired = expiry ? expiry.getTime() < now : false;
                return <tr key={order.id}>
                  <td>{order.order_code}</td><td>{profile?.email ?? '-'}</td><td>{order.delivered_count.toLocaleString('en-US')}</td>
                  <td>{completed?.toLocaleDateString('en-GB') ?? '-'}</td><td>{expiry?.toLocaleDateString('en-GB') ?? '-'}</td>
                  <td>{expired ? <span className="status failed">expired</span> : <>
                    {order.csv_path && <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/download?format=csv`}>CSV</Link>} {' '}
                    {order.xlsx_path && <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/download?format=xlsx`}>Excel</Link>}
                  </>}</td>
                </tr>;
              })}
              {!orders?.length && <tr><td colSpan={6}>No generated files found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
