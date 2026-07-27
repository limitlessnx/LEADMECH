import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { SearchReview } from '@/components/SearchReview';
import { createServerSupabase } from '@/lib/supabase/server';
import type { OrderWithPackage } from '@/types/leadmech';

export default async function Review({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  if (!orderId) redirect('/search');

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/review?order=${orderId}`)}`);

  const { data } = await supabase
    .from('orders')
    .select('id,order_code,status,requested_count,delivered_count,delivery_email,search_filters,csv_path,xlsx_path,error_message,created_at,paid_at,started_at,completed_at,packages(id,name,lead_count,price_usd)')
    .eq('user_id', user.id)
    .eq('id', orderId)
    .in('status', ['paid', 'ready_for_search'])
    .limit(1)
    .returns<OrderWithPackage[]>();

  const order = data?.[0];
  if (!order) {
    return (
      <DashboardShell active="New Search">
        <div className="card">
          <span className="eyebrow">Order unavailable</span>
          <h1>This search cannot be reviewed</h1>
          <p className="muted">The order may still be awaiting payment, already processing, or completed.</p>
          <Link className="btn btn-primary" href="/dashboard">Open dashboard</Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell active="New Search">
      <SearchReview order={{
        id: order.id,
        orderCode: order.order_code,
        leadCount: order.requested_count ?? order.packages?.lead_count ?? 0,
        packageName: order.packages?.name ?? 'Lead package',
      }} />
    </DashboardShell>
  );
}
