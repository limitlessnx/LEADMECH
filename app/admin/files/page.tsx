import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function AdminFiles() {
  const { admin } = await requireAdmin();
  const { data: orders } = await admin
    .from('orders')
    .select('id,order_code,delivered_count,csv_path,xlsx_path,apify_dataset_id,completed_at,profiles(email)')
    .or('csv_path.not.is.null,xlsx_path.not.is.null,apify_dataset_id.not.is.null')
    .order('completed_at', { ascending: false, nullsFirst: false });

  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Lead files</h1><p className="muted">Download completed files or the latest leads returned by any recorded Apify search.</p></div></div>
      <AdminNav active="Files" />
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Leads</th><th>Completed</th><th>Downloads</th></tr></thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                const completed = order.completed_at ? new Date(order.completed_at) : null;
                return <tr key={order.id}>
                  <td>{order.order_code}</td><td>{profile?.email ?? '-'}</td><td>{Number(order.delivered_count ?? 0).toLocaleString('en-US')}</td>
                  <td>{completed?.toLocaleDateString('en-GB') ?? '-'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {order.csv_path && <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/download?format=csv`}>CSV</Link>}
                    {order.xlsx_path && <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/download?format=xlsx`}>Excel</Link>}
                    {order.apify_dataset_id && <>
                      <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/searched-leads?format=csv`}>Searched CSV</Link>
                      <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/searched-leads?format=xlsx`}>Searched Excel</Link>
                    </>}
                  </td>
                </tr>;
              })}
              {!orders?.length && <tr><td colSpan={5}>No searched lead datasets found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
