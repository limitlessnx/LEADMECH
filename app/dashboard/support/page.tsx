import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { createServerSupabase } from '@/lib/supabase/server';

type SupportMessage = {
  id: string;
  order_id: string | null;
  sender_role: 'customer' | 'admin';
  body: string;
  created_at: string;
  orders: { order_code: string } | { order_code: string }[] | null;
};

async function sendSupportMessage(formData: FormData) {
  'use server';
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/support');

  const body = String(formData.get('body') ?? '').trim();
  const orderId = String(formData.get('orderId') ?? '').trim() || null;
  if (!body) redirect('/dashboard/support');

  await supabase.from('support_messages').insert({
    user_id: user.id,
    order_id: orderId,
    sender_role: 'customer',
    body,
    read_by_customer: true,
    read_by_admin: false,
  });

  revalidatePath('/dashboard/support');
  redirect('/dashboard/support');
}

export default async function SupportPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/dashboard/support');

  const [{ data: orders }, { data: messages }] = await Promise.all([
    supabase
      .from('orders')
      .select('id,order_code,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('support_messages')
      .select('id,order_id,sender_role,body,created_at,orders(order_code)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .returns<SupportMessage[]>(),
  ]);

  return (
    <DashboardShell active="Support">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Support</h1>
          <p className="muted">Chat with Leadmech about an order, delivery, or account question.</p>
        </div>
      </div>

      <div className="card">
        <h2>New message</h2>
        <form action={sendSupportMessage} className="form-grid">
          <div className="field full">
            <label>Related order</label>
            <select name="orderId" defaultValue="">
              <option value="">General support</option>
              {(orders ?? []).map((order) => (
                <option key={order.id} value={order.id}>{order.order_code}</option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label>Message</label>
            <textarea name="body" required rows={5} className="support-textarea" placeholder="Write your message..." />
          </div>
          <div className="full form-actions">
            <button className="btn btn-primary" type="submit">Send message</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Conversation</h2>
        <div className="support-thread">
          {(messages ?? []).map((message) => {
            const order = Array.isArray(message.orders) ? message.orders[0] : message.orders;
            return (
              <div key={message.id} className={`support-message ${message.sender_role === 'customer' ? 'from-customer' : 'from-admin'}`}>
                <div className="support-meta">
                  <strong>{message.sender_role === 'customer' ? 'You' : 'Leadmech support'}</strong>
                  <span>{order?.order_code ?? 'General'} - {new Date(message.created_at).toLocaleString('en-GB')}</span>
                </div>
                <p>{message.body}</p>
              </div>
            );
          })}
          {!messages?.length && <p className="muted">No support messages yet.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
