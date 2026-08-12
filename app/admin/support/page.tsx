import { revalidatePath } from 'next/cache';
import { DashboardShell } from '@/components/DashboardShell';
import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

type SupportMessage = {
  id: string;
  user_id: string;
  order_id: string | null;
  sender_role: 'customer' | 'admin';
  body: string;
  created_at: string;
  profiles: { email: string } | { email: string }[] | null;
  orders: { order_code: string } | { order_code: string }[] | null;
};

async function replyToSupport(formData: FormData) {
  'use server';
  const { admin } = await requireAdmin();
  const userId = String(formData.get('userId') ?? '').trim();
  const orderIdValue = String(formData.get('orderId') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  if (!userId || !body) return;

  await admin.from('support_messages').insert({
    user_id: userId,
    order_id: orderIdValue || null,
    sender_role: 'admin',
    body,
    read_by_customer: false,
    read_by_admin: true,
  });

  revalidatePath('/admin/support');
}

export default async function AdminSupportPage() {
  const { admin } = await requireAdmin();
  const { data: messages } = await admin
    .from('support_messages')
    .select('id,user_id,order_id,sender_role,body,created_at,profiles(email),orders(order_code)')
    .order('created_at', { ascending: false })
    .returns<SupportMessage[]>();

  const threads = new Map<string, SupportMessage[]>();
  for (const message of messages ?? []) {
    const key = `${message.user_id}:${message.order_id ?? 'general'}`;
    threads.set(key, [...(threads.get(key) ?? []), message]);
  }

  return (
    <DashboardShell active="Admin">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Support Inbox</h1>
          <p className="muted">Read customer messages and reply from Leadmech.</p>
        </div>
      </div>
      <AdminNav active="Support" />

      <div className="support-inbox">
        {[...threads.entries()].map(([key, thread]) => {
          const latest = thread[0];
          const ordered = [...thread].reverse();
          const profile = Array.isArray(latest.profiles) ? latest.profiles[0] : latest.profiles;
          const order = Array.isArray(latest.orders) ? latest.orders[0] : latest.orders;
          return (
            <div className="card" key={key}>
              <div className="topbar" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{profile?.email ?? 'Customer'}</h2>
                  <p className="muted">{order?.order_code ?? 'General support'} - {thread.length} message{thread.length === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="support-thread">
                {ordered.map((message) => (
                  <div key={message.id} className={`support-message ${message.sender_role === 'admin' ? 'from-admin' : 'from-customer'}`}>
                    <div className="support-meta">
                      <strong>{message.sender_role === 'admin' ? 'You' : profile?.email ?? 'Customer'}</strong>
                      <span>{new Date(message.created_at).toLocaleString('en-GB')}</span>
                    </div>
                    <p>{message.body}</p>
                  </div>
                ))}
              </div>
              <form action={replyToSupport} className="form-grid" style={{ marginTop: 14 }}>
                <input type="hidden" name="userId" value={latest.user_id} />
                <input type="hidden" name="orderId" value={latest.order_id ?? ''} />
                <div className="field full">
                  <label>Reply</label>
                  <textarea name="body" required rows={3} className="support-textarea" placeholder="Write a reply..." />
                </div>
                <div className="full form-actions">
                  <button className="btn btn-primary" type="submit">Send reply</button>
                </div>
              </form>
            </div>
          );
        })}
        {!threads.size && <div className="card"><p className="muted">No support messages yet.</p></div>}
      </div>
    </DashboardShell>
  );
}
