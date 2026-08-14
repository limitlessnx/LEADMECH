import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { SearchBuilder } from '@/components/SearchBuilder';
import { LeadCountLock } from '@/components/LeadCountLock';
import { createServerSupabase } from '@/lib/supabase/server';
import type { OrderWithPackage } from '@/types/leadmech';

export default async function Search({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/search');

  let query = supabase
    .from('orders')
    .select('id,order_code,status,requested_count,original_requested_count,delivered_count,remaining_leads,customer_attempts_used,max_customer_attempts,delivery_email,search_filters,csv_path,xlsx_path,error_message,created_at,paid_at,started_at,completed_at,packages(id,name,lead_count,price_usd)')
    .eq('user_id', user.id)
    .in('status', ['paid', 'ready_for_search', 'completed', 'failed', 'no_results'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (orderId) query = query.eq('id', orderId);

  const { data } = await query.returns<OrderWithPackage[]>();
  const order = data?.[0];
  const purchased = order?.original_requested_count ?? order?.requested_count ?? order?.packages?.lead_count ?? 0;
  const delivered = order?.delivered_count ?? 0;
  const remaining = order?.remaining_leads ?? Math.max(purchased - delivered, 0);
  const attemptsUsed = order?.customer_attempts_used ?? 0;
  const maxAttempts = order?.max_customer_attempts ?? 3;

  if (!order || remaining <= 0 || attemptsUsed >= maxAttempts || !['paid', 'ready_for_search', 'completed', 'failed', 'no_results'].includes(order.status)) {
    return (
      <DashboardShell active="New Search">
        <div className="card">
          <span className="eyebrow">No unlocked search</span>
          <h1>{order && remaining <= 0 ? 'Lead order complete' : order && attemptsUsed >= maxAttempts ? 'Search attempts exhausted' : 'Buy a package first'}</h1>
          <p className="muted">{order && remaining <= 0 ? 'All purchased leads have been delivered.' : order && attemptsUsed >= maxAttempts ? 'This order has used all 3 search attempts.' : 'A lead search unlocks only after payment is confirmed.'}</p>
          <Link className="btn btn-primary" href="/dashboard">Back to dashboard</Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell active="New Search">
      <LeadCountLock orderId={order.id} remaining={remaining} />
      {order.status === 'no_results' && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(245,158,11,.45)' }}>
          <span className="eyebrow">No leads matched</span>
          <h2 style={{ marginTop: 8 }}>Adjust your filters and use another attempt</h2>
          <p className="muted">{order.error_message || 'The selected filters were too restrictive when combined.'}</p>
        </div>
      )}
      {order.status === 'completed' && delivered < purchased && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(59,130,246,.35)' }}>
          <span className="eyebrow">Search incomplete</span>
          <h2 style={{ marginTop: 8 }}>{delivered.toLocaleString('en-GB')} delivered, {remaining.toLocaleString('en-GB')} remaining</h2>
          <p className="muted">Your remaining balance is locked. This attempt can only search for the outstanding {remaining.toLocaleString('en-GB')} leads.</p>
        </div>
      )}
      <SearchBuilder order={{
        id: order.id,
        orderCode: order.order_code,
        leadCount: remaining,
        packageName: order.packages?.name ?? 'Lead package',
        deliveryEmail: order.delivery_email,
      }} />
    </DashboardShell>
  );
}
