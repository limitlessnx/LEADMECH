import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminOrder = {
  id: string;
  order_code: string;
  status: string;
  payment_status: string | null;
  requested_count: number | null;
  delivered_count: number;
  apify_run_id: string | null;
  created_at: string;
  profiles: { email: string } | null;
  packages: { name: string; lead_count: number; price_usd: number | string } | null;
};

export default async function Admin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/admin');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('id,order_code,status,payment_status,requested_count,delivered_count,apify_run_id,created_at,profiles(email),packages(name,lead_count,price_usd)')
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<AdminOrder[]>();

  const rows = orders ?? [];
  const revenue = rows.reduce((sum, order) => order.status !== 'awaiting_payment' ? sum + Number(order.packages?.price_usd ?? 0) : sum, 0);
  const processing = rows.filter((order) => order.status === 'processing').length;
  const failed = rows.filter((order) => order.status === 'failed').length;

  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Admin dashboard</h1><p className="muted">Orders, payments, actor runs, and files.</p></div><button className="btn btn-secondary">Pause orders</button></div>
      <div className="dashboard-grid">
        <div className="metric"><span className="muted">Revenue</span><strong>${revenue}</strong></div>
        <div className="metric"><span className="muted">Processing</span><strong>{processing}</strong></div>
        <div className="metric"><span className="muted">Failed</span><strong>{failed}</strong></div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <h2>Order operations</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Package</th><th>Payment</th><th>Run</th></tr></thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_code}</td>
                  <td>{order.profiles?.email ?? 'Unknown'}</td>
                  <td>{order.packages?.lead_count.toLocaleString('en-GB') ?? order.requested_count}</td>
                  <td><span className={`status ${order.status === 'awaiting_payment' ? 'processing' : 'completed'}`}>{order.payment_status ?? order.status}</span></td>
                  <td><span className={`status ${order.status}`}>{order.apify_run_id ? order.apify_run_id.slice(0, 10) : order.status}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5}>No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
