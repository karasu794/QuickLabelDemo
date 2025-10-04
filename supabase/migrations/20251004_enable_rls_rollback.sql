-- SR-A Rollback: Re-enable Row Level Security (RLS) and recreate minimal policies

-- 1) Enable RLS on target tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.address_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.open_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quote_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_cache ENABLE ROW LEVEL SECURITY;

-- 2) Minimal owner/self policies (example; adjust as needed)
DO $$
BEGIN
  -- profiles: owner can select/insert/update/delete
  BEGIN
    CREATE POLICY profiles_owner_all ON public.profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- shipments: owner access by user_id
  BEGIN
    CREATE POLICY shipments_owner_all ON public.shipments FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- address_book: owner access by user_id
  BEGIN
    CREATE POLICY address_book_owner_all ON public.address_book FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 3) Optional: service_role full access examples (commented)
-- CREATE POLICY "Allow full access for service_role" ON public.shipments FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


