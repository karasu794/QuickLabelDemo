-- shipments: add HTS code (nullable for existing rows)
alter table if exists public.shipments
  add column if not exists hts_code text null;
