-- payments table for cancellation flow persistence

create table if not exists public.payments (
  id text primary key,
  amount integer not null,
  currency text not null,
  status text not null,
  refunded_amount integer not null default 0,
  status_detail text,
  last_error_code text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- index helpers
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_updated_at_desc on public.payments(updated_at desc);

-- touch updated_at trigger (reuses function if exists)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_payments_touch on public.payments;
create trigger trg_payments_touch before update on public.payments
for each row execute procedure public.touch_updated_at();


