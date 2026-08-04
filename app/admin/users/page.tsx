import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function AdminUsers() {
  const { admin } = await requireAdmin();
  const [{ data: users }, { data: orders }] = await Promise.all([
    admin.from('profiles').select('id,email,role,created_at').order('created_at', { ascending: false }),
    admin.from('orders').select('user_id,status,requested_count,delivered_count,packages(price_usd)'),
  ]);

  return (
    <DashboardShell active="Admin">
      <div className="topbar"><div><h1 style={{ margin: 0 }}>Users</h1><p className="muted">Customer accounts, purchases, spending, and delivered leads.</p></div></div>
      <AdminNav active="Users" />
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Orders</th><th>Total value</th><th>Purchased</th><th>Delivered</th><th>Joined</th></tr></thead>
            <tbody>
              {(users ?? []).map((user) => {
                const owned = (orders ?? []).filter((order) => order.user_id === user.id);
                const value = owned.reduce((sum, order) => {
                  const pkg = Array.isArray(order.packages) ? order.packages[0] : order.packages;
                  return order.status === 'awaiting_payment' ? sum : sum + Number(pkg?.price_usd ?? 0);
                }, 0);
                const purchased = owned.reduce((sum, order) => sum + Number(order.requested_count ?? 0), 0);
                const delivered = owned.reduce((sum, order) => sum + Number(order.delivered_count ?? 0), 0);
                return <tr key={user.id}>
                  <td>{user.email}</td><td>{user.role}</td><td>{owned.length}</td><td>${value}</td>
                  <td>{purchased.toLocaleString('en-US')}</td><td>{delivered.toLocaleString('en-US')}</td>
                  <td>{new Date(user.created_at).toLocaleDateString('en-GB')}</td>
                </tr>;
              })}
              {!users?.length && <tr><td colSpan={7}>No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
