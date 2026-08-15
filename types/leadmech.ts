export type OrderStatus = 'awaiting_payment' | 'paid' | 'ready_for_search' | 'processing' | 'no_results' | 'completed' | 'failed';

export type PackageRow = {
  id: string;
  name: string;
  lead_count: number;
  price_usd: number | string;
};

export type OrderWithPackage = {
  id: string;
  order_code: string;
  status: OrderStatus;
  payment_status: string | null;
  requested_count: number | null;
  original_requested_count: number | null;
  delivered_count: number;
  remaining_leads: number | null;
  customer_attempts_used: number;
  max_customer_attempts: number;
  delivery_email: string;
  search_filters: Record<string, unknown>;
  csv_path: string | null;
  xlsx_path: string | null;
  error_message: string | null;
  apify_run_id: string | null;
  created_at: string;
  paid_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  packages: PackageRow | null;
};
