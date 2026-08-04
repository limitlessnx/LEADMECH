import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.04)', fontSize: 13 }}>{JSON.stringify(value ?? {}, null, 2)}</pre>;
}

export default async function AdminRunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const { data: order } = await admin
    .from('orders')
    .select('id,order_code,status,requested_count,delivered_count,delivery_email,search_filters,apify_input,apify_run_id,apify_dataset_id,error_message,started_at,completed_at,created_at,profiles(email),packages(name,lead_count,price_usd)')
    .eq('id', id)
    .single();
  if (!order) notFound();

  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
  const actorRunUrl = order.apify_run_id ? `https://console.apify.com/actors/runs/${order.apify_run_id}` : null;
  const datasetUrl = order.apify_dataset_id ? `https://console.apify.com/storage/datasets/${order.apify_dataset_id}` : null;

  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Run {order.order_code}</h1><p className="muted">Full execution details and direct actor access.</p></div><Link className="btn btn-secondary" href="/admin/runs">Back to runs</Link></div>
      <AdminNav active="Runs" />
      <div className="dashboard-grid">
        <div className="metric"><span className="muted">Status</span><strong>{order.status.replaceAll('_',' ')}</strong></div>
        <div className="metric"><span className="muted">Requested</span><strong>{Number(order.requested_count ?? 0).toLocaleString('en-US')}</strong></div>
        <div className="metric"><span className="muted">Delivered</span><strong>{Number(order.delivered_count ?? 0).toLocaleString('en-US')}</strong></div>
        <div className="metric"><span className="muted">Customer</span><strong style={{ fontSize: 16 }}>{profile?.email ?? order.delivery_email}</strong></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Actor access</h2>
        <p><strong>Run ID:</strong> {order.apify_run_id ?? 'Not assigned'}</p>
        <p><strong>Dataset ID:</strong> {order.apify_dataset_id ?? 'Not assigned'}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {actorRunUrl && <a className="btn btn-primary" href={actorRunUrl} target="_blank" rel="noreferrer">Open Apify run</a>}
          {datasetUrl && <a className="btn btn-secondary" href={datasetUrl} target="_blank" rel="noreferrer">Open dataset</a>}
        </div>
        {order.error_message && <div style={{ marginTop: 16 }}><strong>Error or diagnostic</strong><p className="muted">{order.error_message}</p></div>}
      </div>
      <div className="card" style={{ marginTop: 18 }}><h2>Customer filters</h2><JsonBlock value={order.search_filters} /></div>
      <div className="card" style={{ marginTop: 18 }}><h2>Apify payload</h2><JsonBlock value={order.apify_input} /></div>
    </DashboardShell>
  );
}
