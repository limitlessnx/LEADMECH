import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function AdminRuns() {
  const { admin } = await requireAdmin();
  const { data: orders } = await admin
    .from('orders')
    .select('id,order_code,status,requested_count,delivered_count,apify_run_id,apify_dataset_id,error_message,started_at,completed_at,created_at,profiles(email)')
    .not('apify_run_id','is',null)
    .order('started_at', { ascending: false });

  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Search runs</h1><p className="muted">Apify execution history, datasets, progress, and failures.</p></div></div>
      <AdminNav active="Runs" />
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>User</th><th>Status</th><th>Progress</th><th>Run ID</th><th>Started</th><th>Access</th></tr></thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                return <tr key={order.id}>
                  <td>{order.order_code}</td>
                  <td>{profile?.email ?? '-'}</td>
                  <td><span className={`status ${order.status}`}>{order.status.replaceAll('_',' ')}</span></td>
                  <td>{order.delivered_count.toLocaleString('en-US')} / {(order.requested_count ?? 0).toLocaleString('en-US')}</td>
                  <td>{order.apify_run_id?.slice(0,12)}</td>
                  <td>{order.started_at ? new Date(order.started_at).toLocaleString('en-GB') : '-'}</td>
                  <td><Link className="btn btn-secondary" href={`/admin/runs/${order.id}`}>Inspect</Link></td>
                </tr>;
              })}
              {!orders?.length && <tr><td colSpan={7}>No Apify runs found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
