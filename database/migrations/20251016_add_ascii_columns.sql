-- ASCII 正規化用カラム追加（非破壊）
-- 実行日: 2025-10-16

-- profiles テーブルに *_ascii 列を追加
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS full_name_ascii TEXT,
  ADD COLUMN IF NOT EXISTS company_name_ascii TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_ascii TEXT,
  ADD COLUMN IF NOT EXISTS address_ascii TEXT,
  ADD COLUMN IF NOT EXISTS postal_code_ascii TEXT,
  ADD COLUMN IF NOT EXISTS city_ascii TEXT,
  ADD COLUMN IF NOT EXISTS state_ascii TEXT,
  ADD COLUMN IF NOT EXISTS country_ascii TEXT;

-- address_book テーブルに *_ascii 列を追加
ALTER TABLE public.address_book 
  ADD COLUMN IF NOT EXISTS contact_name_ascii TEXT,
  ADD COLUMN IF NOT EXISTS company_name_ascii TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_ascii TEXT,
  ADD COLUMN IF NOT EXISTS country_code_ascii TEXT,
  ADD COLUMN IF NOT EXISTS postal_code_ascii TEXT,
  ADD COLUMN IF NOT EXISTS state_code_ascii TEXT,
  ADD COLUMN IF NOT EXISTS city_ascii TEXT,
  ADD COLUMN IF NOT EXISTS address1_ascii TEXT,
  ADD COLUMN IF NOT EXISTS address2_ascii TEXT;

-- 備考:
-- - RLS/権限は既存ポリシーに準拠（owner 更新／service_role 管理）。
-- - 既存アプリは原文列を引き続き参照可能（後方互換）。


