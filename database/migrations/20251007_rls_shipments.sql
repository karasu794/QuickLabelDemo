-- QuickLabel RLS Policies (shipments)
-- Purpose: Define policies for admin SELECT-only, owner CRUD, and service_role FULL.
-- NOTE: RLS enable is deferred to PR#1b. Do not enable in this migration.

-- Optional (deferred):
-- ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY; -- enable in PR#1b

-- Cleanup existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view their own shipments." ON public.shipments;
DROP POLICY IF EXISTS "Users can create their own shipments." ON public.shipments;
DROP POLICY IF EXISTS "Users can update their own shipments." ON public.shipments;
DROP POLICY IF EXISTS "Users can delete their own shipments." ON public.shipments;
DROP POLICY IF EXISTS "Service role has full access to shipments." ON public.shipments;
DROP POLICY IF EXISTS "Admin users have full access to shipments." ON public.shipments;
DROP POLICY IF EXISTS "Owner select shipments" ON public.shipments;
DROP POLICY IF EXISTS "Owner insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Owner update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Owner delete shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admin select shipments" ON public.shipments;
DROP POLICY IF EXISTS "Service role full shipments" ON public.shipments;

-- Admin: SELECT only
CREATE POLICY "Admin select shipments"
ON public.shipments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.is_admin = TRUE OR p.role = 'admin')
  )
);

-- Owner: CRUD
CREATE POLICY "Owner select shipments"
ON public.shipments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner insert shipments"
ON public.shipments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner update shipments"
ON public.shipments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner delete shipments"
ON public.shipments FOR DELETE
USING (auth.uid() = user_id);

-- Service role: FULL
CREATE POLICY "Service role full shipments"
ON public.shipments FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ROLLBACK:
-- To revert to previous behavior (example):
-- 1) Drop new policies
--    DROP POLICY IF EXISTS "Admin select shipments" ON public.shipments;
--    DROP POLICY IF EXISTS "Owner select shipments" ON public.shipments;
--    DROP POLICY IF EXISTS "Owner insert shipments" ON public.shipments;
--    DROP POLICY IF EXISTS "Owner update shipments" ON public.shipments;
--    DROP POLICY IF EXISTS "Owner delete shipments" ON public.shipments;
--    DROP POLICY IF EXISTS "Service role full shipments" ON public.shipments;
-- 2) Restore former admin FULL policy
--    CREATE POLICY "Admin users have full access to shipments." ON public.shipments FOR ALL
--    USING (
--      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
--    )
--    WITH CHECK (
--      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
--    );
-- 3) Optionally restore prior owner policies if they existed
--    CREATE POLICY "Users can view their own shipments." ON public.shipments FOR SELECT USING (auth.uid() = user_id);
--    CREATE POLICY "Users can create their own shipments." ON public.shipments FOR INSERT WITH CHECK (auth.uid() = user_id);
--    CREATE POLICY "Users can update their own shipments." ON public.shipments FOR UPDATE USING (auth.uid() = user_id);
--    CREATE POLICY "Users can delete their own shipments." ON public.shipments FOR DELETE USING (auth.uid() = user_id);

