-- profiles: minimal localization columns (nullable)
alter table if exists public.profiles
  add column if not exists display_name_ja text null,
  add column if not exists display_name_en text null;

-- addresses: minimal localization columns (nullable)
alter table if exists public.addresses
  add column if not exists label_ja text null,
  add column if not exists label_en text null;

-- company_info: JP/EN company info (nullable)
alter table if exists public.company_info
  add column if not exists name_ja text null,
  add column if not exists name_en text null;
