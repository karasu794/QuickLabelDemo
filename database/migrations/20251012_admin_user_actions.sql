-- admin user actions (ban/suspend/resume/delete logical) migration
-- 1) profiles に管理用列を追加（論理削除・停止・一時停止）
alter table if exists public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists suspended_until timestamptz null,
  add column if not exists deleted_at timestamptz null;

comment on column public.profiles.is_banned is '管理者による永久停止フラグ';
comment on column public.profiles.suspended_until is '一時停止の期限（これを過ぎれば自動的に有効化）';
comment on column public.profiles.deleted_at is '論理削除のタイムスタンプ';

create index if not exists idx_profiles_is_banned on public.profiles (is_banned);
create index if not exists idx_profiles_suspended_until on public.profiles (suspended_until);
create index if not exists idx_profiles_deleted_at on public.profiles (deleted_at);

-- 2) v_is_active_user ビュー（現在ユーザーが有効か）
create or replace view public.v_is_active_user as
select coalesce((
  select (
    p.deleted_at is null
    and not p.is_banned
    and (p.suspended_until is null or p.suspended_until < now())
  )
  from public.profiles p
  where p.id = auth.uid()
), false) as is_active;

comment on view public.v_is_active_user is '現在のセッションユーザーが有効（ACTIVE）かどうかのフラグビュー';

-- 3) 監査ログテーブル（admin_actions）
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  target_user_id uuid not null,
  action text not null check (action in ('ban','suspend','resume','delete')),
  reason text null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

comment on table public.admin_actions is '管理操作の監査ログ（actor/target/action/reason/payload/at）';

-- RLS 設定: service_role のみ全権限、それ以外は参照不可
alter table public.admin_actions enable row level security;
drop policy if exists "service role can manage admin actions" on public.admin_actions;
create policy "service role can manage admin actions" on public.admin_actions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 4) RLS 調整（主要テーブルの所有者ポリシーにユーザー有効性を付与）
-- profiles: 自分のプロフィールへのアクセスは有効ユーザーのみ（admin は別途フルアクセス）
do $$ begin
  if exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can view own profile') then
    drop policy "Users can view own profile" on public.profiles;
  end if;
  create policy "Users can view own profile" on public.profiles
    for select using (
      auth.uid() = id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  if exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can update own profile') then
    drop policy "Users can update own profile" on public.profiles;
  end if;
  create policy "Users can update own profile" on public.profiles
    for update using (
      auth.uid() = id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    ) with check (
      auth.uid() = id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );
end $$;

-- shipments/address_book/drafts: 所有者ポリシーに is_active 条件を追加
-- 注意: 既存の admin / service_role ポリシーはそのまま維持
do $$ begin
  -- shipments
  if exists (select 1 from pg_policies where tablename='shipments' and policyname='Users can view their own shipments.') then
    drop policy "Users can view their own shipments." on public.shipments;
  end if;
  create policy "Users can view their own shipments." on public.shipments
    for select using (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  if exists (select 1 from pg_policies where tablename='shipments' and policyname='Users can create their own shipments.') then
    drop policy "Users can create their own shipments." on public.shipments;
  end if;
  create policy "Users can create their own shipments." on public.shipments
    for insert with check (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  if exists (select 1 from pg_policies where tablename='shipments' and policyname='Users can update their own shipments.') then
    drop policy "Users can update their own shipments." on public.shipments;
  end if;
  create policy "Users can update their own shipments." on public.shipments
    for update using (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  if exists (select 1 from pg_policies where tablename='shipments' and policyname='Users can delete their own shipments.') then
    drop policy "Users can delete their own shipments." on public.shipments;
  end if;
  create policy "Users can delete their own shipments." on public.shipments
    for delete using (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  -- address_book
  if exists (select 1 from pg_policies where tablename='address_book' and policyname='Users can manage their own address book.') then
    drop policy "Users can manage their own address book." on public.address_book;
  end if;
  create policy "Users can manage their own address book." on public.address_book
    for all using (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    ) with check (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  -- drafts
  if exists (select 1 from pg_policies where tablename='drafts' and policyname='Users can view own drafts') then
    drop policy "Users can view own drafts" on public.drafts;
  end if;
  create policy "Users can view own drafts" on public.drafts
    for select using (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  if exists (select 1 from pg_policies where tablename='drafts' and policyname='Users can create own drafts') then
    drop policy "Users can create own drafts" on public.drafts;
  end if;
  create policy "Users can create own drafts" on public.drafts
    for insert with check (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  if exists (select 1 from pg_policies where tablename='drafts' and policyname='Users can update own drafts') then
    drop policy "Users can update own drafts" on public.drafts;
  end if;
  create policy "Users can update own drafts" on public.drafts
    for update using (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    ) with check (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );

  if exists (select 1 from pg_policies where tablename='drafts' and policyname='Users can delete own drafts') then
    drop policy "Users can delete own drafts" on public.drafts;
  end if;
  create policy "Users can delete own drafts" on public.drafts
    for delete using (
      auth.uid() = user_id
      and exists (select 1 from public.v_is_active_user a where a.is_active = true)
    );
end $$;


