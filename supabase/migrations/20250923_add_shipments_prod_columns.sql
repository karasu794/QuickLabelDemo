-- Shipments production columns & constraints (idempotent)
-- Note: Uses IF NOT EXISTS to be safe on re-runs

begin;

-- Columns (add only if missing)
alter table if exists public.shipments
  add column if not exists label_blob_url text;

alter table if exists public.shipments
  add column if not exists fedex_account_kind text check (fedex_account_kind in ('export','import'));

alter table if exists public.shipments
  add column if not exists service_type text;

alter table if exists public.shipments
  add column if not exists currency text;

alter table if exists public.shipments
  add column if not exists rate_total numeric(12,2);

-- Unique index on order_id (create if not exists)
create unique index if not exists shipments_order_id_key on public.shipments(order_id);

-- Advisory lock helper function (transaction-scoped)
create or replace function public.ql_advisory_xact_lock_order(order_id text)
returns void
language sql
as $$
  select pg_advisory_xact_lock(hashtext(order_id));
$$;

commit;
