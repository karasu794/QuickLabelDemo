-- profiles.is_admin 追加（既定 false）、既存 role='admin' の移行、インデックス、RLS補助

-- 01. カラム追加（既定 false）
alter table if exists public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin
  is 'UI/権限制御のための管理者フラグ。role=admin との併用。';

-- 02. 既存データ移行（role='admin' → is_admin=true）
update public.profiles
   set is_admin = true
 where role = 'admin';

-- 03. 閲覧クエリ向けの軽量 index
create index if not exists idx_profiles_is_admin on public.profiles (is_admin);

-- 04. RLS ポリシー（存在しない場合のみ作成）
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='profiles' and policyname='select own profile'
  ) then
    create policy "select own profile" on public.profiles
      for select using (auth.uid() = id);
  end if;
end$$;


