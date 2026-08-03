import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { SearchBuilder } from '@/components/SearchBuilder';
import { createServerSupabase } from '@/lib/supabase/server';
import type { OrderWithPackage } from '@/types/leadmech';

export default async function Search({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/search');

  let query = supabase
    .from('orders')
    .select('id,order_code,status,requested_count,delivered_count,delivery_email,search_filters,csv_path,xlsx_path,error_message,created_at,paid_at,started_at,completed_at,packages(id,name,lead_count,price_usd)')
    .eq('user_id', user.id)
    .in('status', ['paid', 'ready_for_search', 'no_results'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (orderId) query = query.eq('id', orderId);

  const { data } = await query.returns<OrderWithPackage[]>();
  const order = data?.[0];

  if (!order) {
    return (
      <DashboardShell active="New Search">
        <div className="card">
          <span className="eyebrow">No unlocked search</span>
          <h1>Buy a package first</h1>
          <p className="muted">A lead search unlocks only after payment is confirmed.</p>
          <Link className="btn btn-primary" href="/#pricing">View packages</Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell active="New Search">
      {order.status === 'no_results' && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(245,158,11,.45)' }}>
          <span className="eyebrow">No leads matched</span>
          <h2 style={{ marginTop: 8 }}>Adjust one filter and run again</h2>
          <p className="muted">{order.error_message || 'The selected filters were too restrictive when combined.'}</p>
          <p className="muted">You have not lost this order and do not need to purchase again.</p>
        </div>
      )}
      <SearchBuilder order={{
        id: order.id,
        orderCode: order.order_code,
        leadCount: order.requested_count ?? order.packages?.lead_count ?? 0,
        packageName: order.packages?.name ?? 'Lead package',
        deliveryEmail: order.delivery_email,
      }} />
    </DashboardShell>
  );
}
