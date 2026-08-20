import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { LeadCountLock } from '@/components/LeadCountLock';
import { TemplateSearchLoader } from '@/components/TemplateSearchLoader';
import { createServerSupabase } from '@/lib/supabase/server';
import type { OrderWithPackage } from '@/types/leadmech';

export default async function Search({ searchParams }: { searchParams: Promise<{ order?: string; template?: string }> }) {
  const { order: orderId, template: templateId } = await searchParams;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/search');

  let query = supabase.from('orders').select('id,order_code,status,requested_count,original_requested_count,delivered_count,remaining_leads,customer_attempts_used,max_customer_attempts,delivery_email,search_filters,csv_path,xlsx_path,error_message,created_at,paid_at,started_at,completed_at,packages(id,name,lead_count,price_usd)').eq('user_id', user.id).in('status', ['paid', 'ready_for_search', 'completed', 'failed', 'no_results']).order('created_at', { ascending: false }).limit(1);
  if (orderId) query = query.eq('id', orderId);
  const { data } = await query.returns<OrderWithPackage[]>();
  const order = data?.[0];
  const purchased = order?.original_requested_count ?? order?.requested_count ?? order?.packages?.lead_count ?? 0;
  const delivered = order?.delivered_count ?? 0;
  const remaining = order?.remaining_leads ?? Math.max(purchased - delivered, 0);
  const attemptsUsed = order?.customer_attempts_used ?? 0;
  const maxAttempts = order?.max_customer_attempts ?? 3;

  let templateFilters: Record<string, unknown> | null = null;
  if (templateId) {
    const { data: template } = await supabase.from('saved_templates').select('filters').eq('id', templateId).eq('user_id', user.id).maybeSingle();
    templateFilters = (template?.filters && typeof template.filters === 'object' && !Array.isArray(template.filters)) ? template.filters as Record<string, unknown> : null;
  }

  if (!order || remaining <= 0 || attemptsUsed >= maxAttempts || !['paid', 'ready_for_search'].includes(order.status)) {
    return <DashboardShell active="New Search"><div className="card"><span className="eyebrow">No unlocked search</span><h1>{order && remaining <= 0 ? 'Lead order complete' : order && attemptsUsed >= maxAttempts ? 'Search attempts exhausted' : 'Search unavailable'}</h1><p className="muted">{order && remaining <= 0 ? 'All purchased leads have been delivered.' : order && attemptsUsed >= maxAttempts ? 'This order has used all 3 search attempts.' : 'A search is available only after payment is confirmed and while the order is unlocked.'}</p><Link className="btn btn-primary" href="/dashboard">Back to dashboard</Link></div></DashboardShell>;
  }

  return <DashboardShell active="New Search">
    <LeadCountLock orderId={order.id} remaining={remaining} />
    {templateFilters && <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(59,130,246,.35)' }}><span className="eyebrow">Saved template loaded</span><h2 style={{ marginTop: 8 }}>Your saved targeting filters are ready</h2><p className="muted">Review the filters below before submitting the search. Human beings do occasionally benefit from checking things before pressing buttons.</p></div>}
    {delivered > 0 && remaining > 0 && <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(59,130,246,.35)' }}><span className="eyebrow">Search incomplete</span><h2 style={{ marginTop: 8 }}>{delivered.toLocaleString('en-GB')} delivered, {remaining.toLocaleString('en-GB')} remaining</h2><p className="muted">Your remaining balance is locked. This attempt can only search for the outstanding {remaining.toLocaleString('en-GB')} leads. You have {Math.max(maxAttempts - attemptsUsed, 0)} customer attempt{maxAttempts - attemptsUsed === 1 ? '' : 's'} remaining.</p></div>}
    {order.status === 'failed' && <div className="card" style={{ marginBottom: 18, borderColor: 'rgba(245,158,11,.45)' }}><span className="eyebrow">Previous attempt failed</span><h2 style={{ marginTop: 8 }}>Your locked balance remains {remaining.toLocaleString('en-GB')} leads</h2><p className="muted">{order.error_message || 'The previous search failed. Your next attempt remains locked to the outstanding balance.'}</p></div>}
    <TemplateSearchLoader order={{ id: order.id, orderCode: order.order_code, leadCount: remaining, packageName: order.packages?.name ?? 'Lead package', deliveryEmail: order.delivery_email }} templateFilters={templateFilters} />
  </DashboardShell>;
}
