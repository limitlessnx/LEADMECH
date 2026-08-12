import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { createServerSupabase } from '@/lib/supabase/server';

const FILE_RETENTION_DAYS = 30;

export default async function MyLeadsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/leads');

  const cutoff = new Date(Date.now() - FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: orders } = await supabase
    .from('orders')
    .select('id,order_code,status,requested_count,delivered_count,search_filters,csv_path,xlsx_path,completed_at,created_at,packages(name,lead_count)')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('completed_at', cutoff)
    .order('completed_at', { ascending: false });

  const rows = orders ?? [];

  return (
    <DashboardShell active="My Leads">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>My Leads</h1>
          <p className="muted">Completed lead files remain available for 30 days from completion.</p>
        </div>
        <Link className="btn btn-primary" href="/#pricing">Buy another package</Link>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Delivered</th><th>Completed</th><th>Expires</th><th>Downloads</th></tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const completedAt = order.completed_at ? new Date(order.completed_at) : new Date(order.created_at);
                const expiresAt = new Date(completedAt.getTime() + FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
                const requested = Number(order.requested_count ?? order.packages?.lead_count ?? 0);
                const delivered = Number(order.delivered_count || 0);
                const canSearchAgain = requested > 0 && delivered < requested;
                return (
                  <tr key={order.id}>
                    <td><strong>{order.order_code}</strong></td>
                    <td>{delivered.toLocaleString('en-GB')} / {requested.toLocaleString('en-GB')}</td>
                    <td>{completedAt.toLocaleDateString('en-GB')}</td>
                    <td>{expiresAt.toLocaleDateString('en-GB')}</td>
                    <td>
                      {order.csv_path && <Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=csv`}>CSV</Link>}{' '}
                      {order.xlsx_path && <Link className="btn btn-secondary" href={`/api/orders/${order.id}/download?format=xlsx`}>Excel</Link>}
                      {canSearchAgain && (
                        <form action={`/api/orders/${order.id}/rerun`} method="post" style={{ display: 'inline-flex', marginLeft: 8 }}>
                          <button className="btn btn-primary" type="submit">Search again</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={5}>No active lead files yet. Completed files will appear here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
