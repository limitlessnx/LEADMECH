alter table if exists public.orders
  add column if not exists payment_id text,
  add column if not exists payment_status text,
  add column if not exists requested_count integer,
  add column if not exists delivered_count integer,
  add column if not exists delivery_email text,
  add column if not exists search_filters jsonb,
  add column if not exists apify_run_id text,
  add column if not exists apify_dataset_id text,
  add column if not exists csv_path text,
  add column if not exists xlsx_path text,
  add column if not exists paid_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists orders_apify_run_id_idx
on public.orders(apify_run_id);
