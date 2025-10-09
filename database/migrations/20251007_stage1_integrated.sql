-- Stage1 Integrated Migration
-- cancel RPC / RLS harden (admin=SELECT only) / org RLS cleanup
-- Idempotent and rollback-hinted. All operations under explicit transaction.

begin;

-- 0) Helper view: v_is_admin (why: unify admin check for RLS)
create or replace view public.v_is_admin as
select
  auth.uid() as uid,
  coalesce((
    select true
    from public.profiles p
    where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin')
    limit 1
  ), false) as is_admin;

comment on view public.v_is_admin is 'current-user admin flag for RLS policies';

-- 1) shipments RLS (admin=SELECT only / owner=CRUD / service_role FULL)
alter table public.shipments enable row level security;

-- cleanup old policies (safe to drop)
drop policy if exists "Admin users have full access to shipments." on public.shipments;
drop policy if exists "Admin select shipments" on public.shipments;
drop policy if exists "Owner select shipments" on public.shipments;
drop policy if exists "Owner insert shipments" on public.shipments;
drop policy if exists "Owner update shipments" on public.shipments;
drop policy if exists "Owner delete shipments" on public.shipments;
drop policy if exists "Service role full shipments" on public.shipments;

-- admin: SELECT only (security harden)
create policy "Admin select shipments"
on public.shipments for select
using (exists (select 1 from public.v_is_admin a where a.is_admin = true));

-- owner: CRUD
create policy "Owner select shipments"
on public.shipments for select
using (auth.uid() = user_id);

create policy "Owner insert shipments"
on public.shipments for insert
with check (auth.uid() = user_id);

create policy "Owner update shipments"
on public.shipments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Owner delete shipments"
on public.shipments for delete
using (auth.uid() = user_id);

-- service_role: FULL (server internal)
create policy "Service role full shipments"
on public.shipments for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- 2) open_shipments RLS (remove anonymous; add admin SELECT)
alter table public.open_shipments enable row level security;

-- cleanup legacy anonymous and others
drop policy if exists "Allow anonymous access for session management" on public.open_shipments;
drop policy if exists "Users can only access their own open shipments" on public.open_shipments;
drop policy if exists "Admin select open_shipments" on public.open_shipments;
drop policy if exists "Owner select open_shipments" on public.open_shipments;
drop policy if exists "Owner insert open_shipments" on public.open_shipments;
drop policy if exists "Owner update open_shipments" on public.open_shipments;
drop policy if exists "Owner delete open_shipments" on public.open_shipments;
drop policy if exists "Service role full open_shipments" on public.open_shipments;

create policy "Admin select open_shipments"
on public.open_shipments for select
using (exists (select 1 from public.v_is_admin a where a.is_admin = true));

create policy "Owner select open_shipments"
on public.open_shipments for select
using (auth.uid() = user_id);

create policy "Owner insert open_shipments"
on public.open_shipments for insert
with check (auth.uid() = user_id);

create policy "Owner update open_shipments"
on public.open_shipments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Owner delete open_shipments"
on public.open_shipments for delete
using (auth.uid() = user_id);

create policy "Service role full open_shipments"
on public.open_shipments for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- 3) address_book RLS + delete control
alter table public.address_book enable row level security;

-- org RLS cleanup (org_id-based)
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='address_book' and policyname='address_book_org_all'
  ) then
    execute 'drop policy "address_book_org_all" on public.address_book';
  end if;
  -- org_id null-allow (future removal in later PR)
  if exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='address_book' and column_name='org_id'
  ) then
    begin
      execute 'alter table public.address_book alter column org_id drop not null';
    exception when others then
      raise notice 'org_id drop not null skipped';
    end;
  end if;
end $$;

-- source column ensure
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='address_book' and column_name='source'
  ) then
    alter table public.address_book add column source text not null default 'manual';
  end if;
end $$;

-- cleanup
drop policy if exists "Admin select address_book" on public.address_book;
drop policy if exists "Owner select address_book" on public.address_book;
drop policy if exists "Owner insert address_book" on public.address_book;
drop policy if exists "Owner update address_book" on public.address_book;
drop policy if exists "Owner delete address_book" on public.address_book;
drop policy if exists "Service role full address_book" on public.address_book;

-- SELECT: owner or admin
create policy "Admin select address_book"
on public.address_book for select
using (exists (select 1 from public.v_is_admin a where a.is_admin = true));

create policy "Owner select address_book"
on public.address_book for select
using (auth.uid() = user_id);

-- I/U: owner only
create policy "Owner insert address_book"
on public.address_book for insert
with check (auth.uid() = user_id);

create policy "Owner update address_book"
on public.address_book for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- D: owner only AND source='csv' AND not referenced
create or replace function public.fn_address_in_use(addr_id uuid)
returns boolean
language plpgsql
as $$
declare
  in_use boolean := false;
begin
  -- check shipments.sender_address_id / recipient_address_id (TODO: adjust column names if differ)
  if exists (select 1 from public.shipments where sender_address_id = addr_id) then
    in_use := true;
  end if;
  if exists (select 1 from public.shipments where recipient_address_id = addr_id) then
    in_use := true;
  end if;
  return in_use;
end $$;

create policy "Owner delete address_book"
on public.address_book for delete
using (
  auth.uid() = user_id
  and source = 'csv'
  and not public.fn_address_in_use(id)
);

create policy "Service role full address_book"
on public.address_book for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- BEFORE DELETE trigger to hard block referenced deletions (defense-in-depth)
create or replace function public.trg_block_delete_address()
returns trigger
language plpgsql
as $$
begin
  if old.source is distinct from 'csv' then
    raise exception 'only csv-sourced address can be deleted';
  end if;
  if public.fn_address_in_use(old.id) then
    raise exception 'address is referenced by shipments';
  end if;
  return old;
end $$;

drop trigger if exists trg_block_delete_address on public.address_book;
create trigger trg_block_delete_address
before delete on public.address_book
for each row execute function public.trg_block_delete_address();

-- 4) cancel RPC (SECURITY DEFINER)
create or replace function public.cancel_shipment(p_shipment_id uuid)
returns jsonb
language plpgsql
security definer
set local search_path to public
as $$
declare
  is_admin boolean := coalesce((select a.is_admin from public.v_is_admin a), false);
  owner_id uuid;
begin
  select user_id into owner_id from public.shipments where id = p_shipment_id;
  if owner_id is null then
    raise exception 'not_found';
  end if;
  if not (is_admin or owner_id = auth.uid()) then
    raise exception 'forbidden';
  end if;

  update public.shipments
    set status = 'cancelling', cancelled_at = now()
  where id = p_shipment_id;

  -- TODO: add audit_logs in later PR
  -- if table public.logs exists, insert audit record
  -- insert into public.logs(user_id, action, target_type, target_id, result)
  -- values (auth.uid(), 'cancel_request', 'shipment', p_shipment_id, jsonb_build_object('by_admin', is_admin));

  return jsonb_build_object('ok', true);
exception
  when others then
    if sqlerrm like '%not_found%' then
      raise exception 'not_found';
    elsif sqlerrm like '%forbidden%' then
      raise exception 'forbidden';
    else
      raise;
    end if;
end $$;

revoke all on function public.cancel_shipment(uuid) from public, anon;
grant execute on function public.cancel_shipment(uuid) to authenticated;

commit;

-- ROLLBACK (manual):
-- begin;
--  drop function if exists public.cancel_shipment(uuid);
--  drop trigger if exists trg_block_delete_address on public.address_book;
--  drop function if exists public.trg_block_delete_address();
--  drop function if exists public.fn_address_in_use(uuid);
--  drop policy if exists "Service role full address_book" on public.address_book;
--  drop policy if exists "Owner delete address_book" on public.address_book;
--  drop policy if exists "Owner update address_book" on public.address_book;
--  drop policy if exists "Owner insert address_book" on public.address_book;
--  drop policy if exists "Owner select address_book" on public.address_book;
--  drop policy if exists "Admin select address_book" on public.address_book;
--  drop policy if exists "Service role full open_shipments" on public.open_shipments;
--  drop policy if exists "Owner delete open_shipments" on public.open_shipments;
--  drop policy if exists "Owner update open_shipments" on public.open_shipments;
--  drop policy if exists "Owner insert open_shipments" on public.open_shipments;
--  drop policy if exists "Owner select open_shipments" on public.open_shipments;
--  drop policy if exists "Admin select open_shipments" on public.open_shipments;
--  drop policy if exists "Service role full shipments" on public.shipments;
--  drop policy if exists "Owner delete shipments" on public.shipments;
--  drop policy if exists "Owner update shipments" on public.shipments;
--  drop policy if exists "Owner insert shipments" on public.shipments;
--  drop policy if exists "Owner select shipments" on public.shipments;
--  drop policy if exists "Admin select shipments" on public.shipments;
--  drop view if exists public.v_is_admin;
-- commit;


