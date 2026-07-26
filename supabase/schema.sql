begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.order_status as enum ('awaiting_payment','paid','ready_for_search','processing','completed','failed');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  lead_count integer not null check (lead_count in (10000,25000,50000)),
  price_usd numeric(10,2) not null check (price_usd > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  status public.order_status not null default 'awaiting_payment',
  payment_id text,
  payment_status text,
  requested_count integer,
  delivered_count integer not null default 0,
  delivery_email text not null,
  search_filters jsonb not null default '{}'::jsonb,
  apify_input jsonb,
  apify_run_id text,
  apify_dataset_id text,
  csv_path text,
  xlsx_path text,
  error_message text,
  paid_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.packages(name,lead_count,price_usd,active)
values ('Starter',10000,30,true),('Growth',25000,75,true),('Scale',50000,145,true)
on conflict (name) do update set lead_count=excluded.lead_count,price_usd=excluded.price_usd,active=true;

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_id_idx on public.orders(payment_id);
create index if not exists orders_apify_run_id_idx on public.orders(apify_run_id);
create index if not exists saved_templates_user_id_idx on public.saved_templates(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path=public as $$
begin new.updated_at=now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists saved_templates_set_updated_at on public.saved_templates;
create trigger saved_templates_set_updated_at before update on public.saved_templates for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email) values(new.id,coalesce(new.email,''))
  on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.saved_templates enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid())=id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id and role='customer');

drop policy if exists "packages_public_read" on public.packages;
create policy "packages_public_read" on public.packages for select to anon,authenticated using (active=true);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders for insert to authenticated with check ((select auth.uid())=user_id and status='awaiting_payment');

drop policy if exists "templates_select_own" on public.saved_templates;
create policy "templates_select_own" on public.saved_templates for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "templates_insert_own" on public.saved_templates;
create policy "templates_insert_own" on public.saved_templates for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "templates_update_own" on public.saved_templates;
create policy "templates_update_own" on public.saved_templates for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "templates_delete_own" on public.saved_templates;
create policy "templates_delete_own" on public.saved_templates for delete to authenticated using ((select auth.uid())=user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('lead-files','lead-files',false,52428800,array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "lead_files_read_own" on storage.objects;
create policy "lead_files_read_own" on storage.objects for select to authenticated using (bucket_id='lead-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

commit;
