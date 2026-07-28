import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildApifyInput } from '@/lib/search-payload';

type StartOrder = {
  id: string;
  order_code: string;
  user_id: string;
  status: string;
  requested_count: number | null;
  packages: { name: string; lead_count: number; price_usd: number } | { name: string; lead_count: number; price_usd: number }[] | null;
};

async function readWorkflowResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const { search } = await request.json();
  const deliveryEmail = search?.email;
  const confirmEmail = search?.confirmEmail;
  if (!deliveryEmail || deliveryEmail !== confirmEmail) {
    return NextResponse.json({ error: 'Delivery emails must match.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,order_code,user_id,status,requested_count,packages(name,lead_count,price_usd)')
    .eq('id', id)
    .single<StartOrder>();

  if (orderError || !order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (!['paid', 'ready_for_search'].includes(order.status)) {
    return NextResponse.json({ error: 'This order is not ready for search.' }, { status: 409 });
  }

  const webhookUrl = process.env.N8N_START_SEARCH_WEBHOOK_URL;
  const webhookSecret = process.env.LEADMECH_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) {
    return NextResponse.json({
      error: 'The Leadmech workflow is not configured. Add N8N_START_SEARCH_WEBHOOK_URL and LEADMECH_WEBHOOK_SECRET in Vercel.',
    }, { status: 503 });
  }

  const actorInput = buildApifyInput(search ?? {});
  const packageInfo = Array.isArray(order.packages) ? order.packages[0] : order.packages;
  const leadCount = order.requested_count ?? packageInfo?.lead_count ?? 0;

  const workflowResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-leadmech-secret': webhookSecret,
    },
    body: JSON.stringify({
      orderId: id,
      leadCount,
      email: deliveryEmail,
      confirmEmail,
      ...actorInput,
    }),
    cache: 'no-store',
  });

  const workflowData = await readWorkflowResponse(workflowResponse);

  if (!workflowResponse.ok || workflowData.ok === false) {
    const message = typeof workflowData.error === 'string'
      ? workflowData.error
      : 'Unable to start the Leadmech workflow.';

    await admin
      .from('orders')
      .update({ status: 'failed', error_message: message })
      .eq('id', id);

    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    status: workflowData.status ?? 'processing',
    runId: workflowData.runId ?? null,
  });
}
