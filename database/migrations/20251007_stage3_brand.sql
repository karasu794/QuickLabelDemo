begin;

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Phoenix 固定アセット（管理者アップロード）
create table if not exists admin_assets_letterhead (
  id uuid primary key default gen_random_uuid(),
  storage_url text not null,
  file_name text not null,
  content_type text not null,
  created_at timestamptz not null default now(),
  uploaded_by uuid not null references public.profiles(id) on delete restrict
);
create table if not exists admin_assets_signature (
  id uuid primary key default gen_random_uuid(),
  storage_url text not null,
  file_name text not null,
  content_type text not null,
  created_at timestamptz not null default now(),
  uploaded_by uuid not null references public.profiles(id) on delete restrict
);

-- ユーザーアセット
create table if not exists user_letterheads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_url text not null,
  file_name text not null,
  content_type text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists user_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_url text not null,
  file_name text not null,
  content_type text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS
alter table user_letterheads enable row level security;
alter table user_signatures enable row level security;
alter table admin_assets_letterhead enable row level security;
alter table admin_assets_signature enable row level security;

-- owner CRUD / admin SELECT
drop policy if exists p_user_letterheads_owner on user_letterheads;
create policy p_user_letterheads_owner on user_letterheads
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists p_user_signatures_owner on user_signatures;
create policy p_user_signatures_owner on user_signatures
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists p_user_letterheads_admin_select on user_letterheads;
create policy p_user_letterheads_admin_select on user_letterheads
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin'))
  );

drop policy if exists p_user_signatures_admin_select on user_signatures;
create policy p_user_signatures_admin_select on user_signatures
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin'))
  );

-- admin assets は admin のみ ALL
drop policy if exists p_admin_letterhead_admin_all on admin_assets_letterhead;
create policy p_admin_letterhead_admin_all on admin_assets_letterhead
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin'))
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin'))
  );

drop policy if exists p_admin_signature_admin_all on admin_assets_signature;
create policy p_admin_signature_admin_all on admin_assets_signature
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin'))
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role = 'admin'))
  );

commit;


