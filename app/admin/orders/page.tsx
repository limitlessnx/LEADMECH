import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function AdminOrders() {
  const { admin } = await requireAdmin();
  const { data: orders } = await admin
    .from('orders')
    .select('id,order_code,status,payment_status,payment_id,requested_count,delivered_count,delivery_email,created_at,paid_at,profiles(email),packages(name,lead_count,price_usd)')
    .order('created_at', { ascending: false });

  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Orders</h1><p className="muted">All purchases, free orders, payment states, and delivery progress.</p></div></div>
      <AdminNav active="Orders" />
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Package</th><th>Amount</th><th>Payment</th><th>Search</th><th>Date</th><th>Open</th></tr></thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                const pkg = Array.isArray(order.packages) ? order.packages[0] : order.packages;
                return <tr key={order.id}>
                  <td>{order.order_code}</td>
                  <td>{profile?.email ?? order.delivery_email}</td>
                  <td>{pkg?.name ?? 'Package'} · {(order.requested_count ?? pkg?.lead_count ?? 0).toLocaleString('en-US')}</td>
                  <td>${Number(pkg?.price_usd ?? 0)}</td>
                  <td>{order.payment_status ?? (order.status === 'awaiting_payment' ? 'unpaid' : 'confirmed')}</td>
                  <td><span className={`status ${order.status}`}>{order.status.replaceAll('_',' ')}</span></td>
                  <td>{new Date(order.created_at).toLocaleDateString('en-GB')}</td>
                  <td><Link className="btn btn-secondary" href={`/admin/orders/${order.id}`}>View</Link></td>
                </tr>;
              })}
              {!orders?.length && <tr><td colSpan={8}>No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
