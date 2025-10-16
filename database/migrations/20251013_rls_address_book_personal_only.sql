-- AddressBook RLS: personal only
begin;

alter table if exists public.address_book enable row level security;

-- Optionally drop old org-based policies here if present
-- Example:
-- drop policy if exists "address_book_org_select" on public.address_book;
-- drop policy if exists "address_book_org_update" on public.address_book;
-- drop policy if exists "address_book_org_delete" on public.address_book;
-- drop policy if exists "address_book_org_insert" on public.address_book;

create policy if not exists "address_book_select_self_only"
on public.address_book
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = created_by
);

create policy if not exists "address_book_insert_self_only"
on public.address_book
for insert
to authenticated
with check (
  auth.uid() = user_id
  or auth.uid() = created_by
);

create policy if not exists "address_book_update_self_only"
on public.address_book
for update
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = created_by
)
with check (
  auth.uid() = user_id
  or auth.uid() = created_by
);

create policy if not exists "address_book_delete_self_only"
on public.address_book
for delete
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = created_by
);

create index if not exists idx_address_book_user on public.address_book (user_id);
create index if not exists idx_address_book_created_by on public.address_book (created_by);

commit;


