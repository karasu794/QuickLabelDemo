-- SR-A: Disable Row Level Security (RLS) for single-tenant operation

-- 1) Drop all policies on target tables (public schema) to avoid residual behavior
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'shipments',
        'address_book',
        'open_shipments',
        'quote_jobs',
        'notifications',
        'app_settings',
        'receipt_numbers',
        'receipt_cache'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END $$;

-- 2) Disable RLS on target tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.address_book DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.open_shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quote_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_numbers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receipt_cache DISABLE ROW LEVEL SECURITY;

-- 3) Optional: show status (for manual verification)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN (
--   'profiles','shipments','address_book','open_shipments','quote_jobs','notifications','app_settings','receipt_numbers','receipt_cache'
-- ) ORDER BY tablename;


