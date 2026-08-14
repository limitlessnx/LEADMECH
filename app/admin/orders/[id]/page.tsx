import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const { data: order } = await admin
    .from('orders')
    .select('id,order_code,status,payment_status,payment_id,requested_count,delivered_count,delivery_email,search_filters,apify_input,apify_run_id,apify_dataset_id,csv_path,xlsx_path,error_message,paid_at,started_at,completed_at,created_at,profiles(email),packages(name,lead_count,price_usd)')
    .eq('id', id)
    .single();
  if (!order) notFound();
  const { data: attempts } = await admin.from('search_attempts').select('id,attempt_number,source,status,apify_run_id,apify_dataset_id,requested_count,returned_count,error_message,started_at,completed_at').eq('order_id', id).order('attempt_number', { ascending: true });
  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
  const pkg = Array.isArray(order.packages) ? order.packages[0] : order.packages;

  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Order {order.order_code}</h1><p className="muted">Purchase, customer, search, and file details.</p></div><Link className="btn btn-secondary" href="/admin/orders">Back to orders</Link></div>
      <AdminNav active="Orders" />
      <div className="dashboard-grid">
        <div className="metric"><span className="muted">Customer</span><strong style={{ fontSize: 16 }}>{profile?.email ?? order.delivery_email}</strong></div>
        <div className="metric"><span className="muted">Package</span><strong>{pkg?.name ?? 'Package'}</strong></div>
        <div className="metric"><span className="muted">Amount</span><strong>${Number(pkg?.price_usd ?? 0)}</strong></div>
        <div className="metric"><span className="muted">Status</span><strong>{order.status.replaceAll('_',' ')}</strong></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Order details</h2>
        <p><strong>Payment:</strong> {order.payment_status ?? 'Not recorded'}</p>
        <p><strong>Payment ID:</strong> {order.payment_id ?? '-'}</p>
        <p><strong>Requested:</strong> {Number(order.requested_count ?? pkg?.lead_count ?? 0).toLocaleString('en-US')}</p>
        <p><strong>Delivered:</strong> {Number(order.delivered_count ?? 0).toLocaleString('en-US')}</p>
        <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString('en-GB')}</p>
        <p><strong>Paid:</strong> {order.paid_at ? new Date(order.paid_at).toLocaleString('en-GB') : '-'}</p>
        {order.error_message && <p><strong>Error:</strong> {order.error_message}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <form action={`/api/admin/orders/${order.id}/rerun`} method="post"><button className="btn btn-primary" type="submit">Repair and rerun</button></form>
          {order.apify_run_id && <Link className="btn btn-primary" href={`/admin/runs/${order.id}`}>Inspect run</Link>}
          {order.csv_path && <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/download?format=csv`}>Download CSV</Link>}
          {order.xlsx_path && <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/download?format=xlsx`}>Download Excel</Link>}
          {order.apify_dataset_id && <>
            <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/searched-leads?format=csv`}>Download searched CSV</Link>
            <Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/searched-leads?format=xlsx`}>Download searched Excel</Link>
          </>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Search attempts</h2>
        <p className="muted">Every Apify run is now recorded independently, including automatic expansion runs. Each dataset can be downloaded without overwriting another attempt.</p>
        <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Source</th><th>Status</th><th>Returned</th><th>Run</th><th>Downloads</th></tr></thead><tbody>
          {(attempts ?? []).map((attempt) => <tr key={attempt.id}>
            <td>{attempt.attempt_number}</td><td>{attempt.source}</td><td>{attempt.status}</td><td>{Number(attempt.returned_count ?? 0).toLocaleString('en-US')}</td><td>{attempt.apify_run_id ?? '-'}</td>
            <td>{attempt.apify_dataset_id ? <><Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/attempts/${attempt.id}/download?format=csv`}>CSV</Link>{' '}<Link className="btn btn-secondary" href={`/api/admin/orders/${order.id}/attempts/${attempt.id}/download?format=xlsx`}>Excel</Link></> : '-'}</td>
          </tr>)}
          {!attempts?.length && <tr><td colSpan={6}>No search attempts have been recorded for this order.</td></tr>}
        </tbody></table></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}><h2>Search filters</h2><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(order.search_filters ?? {}, null, 2)}</pre></div>
    </DashboardShell>
  );
}
