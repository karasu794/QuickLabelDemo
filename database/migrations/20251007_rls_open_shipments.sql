-- QuickLabel RLS Policies (open_shipments)
-- Purpose: Align to admin SELECT-only, owner CRUD, service_role FULL.
-- NOTE: RLS enable is deferred to PR#1b. Do not enable in this migration.

-- Optional (deferred):
-- ALTER TABLE public.open_shipments ENABLE ROW LEVEL SECURITY; -- enable in PR#1b

-- Cleanup existing/legacy policies (idempotent)
DROP POLICY IF EXISTS "Users can only access their own open shipments" ON public.open_shipments;
DROP POLICY IF EXISTS "Allow anonymous access for session management" ON public.open_shipments;
DROP POLICY IF EXISTS "Owner select open_shipments" ON public.open_shipments;
DROP POLICY IF EXISTS "Owner insert open_shipments" ON public.open_shipments;
DROP POLICY IF EXISTS "Owner update open_shipments" ON public.open_shipments;
DROP POLICY IF EXISTS "Owner delete open_shipments" ON public.open_shipments;
DROP POLICY IF EXISTS "Admin select open_shipments" ON public.open_shipments;
DROP POLICY IF EXISTS "Service role full open_shipments" ON public.open_shipments;

-- Admin: SELECT only
CREATE POLICY "Admin select open_shipments"
ON public.open_shipments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.is_admin = TRUE OR p.role = 'admin')
  )
);

-- Owner: CRUD
CREATE POLICY "Owner select open_shipments"
ON public.open_shipments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner insert open_shipments"
ON public.open_shipments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner update open_shipments"
ON public.open_shipments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner delete open_shipments"
ON public.open_shipments FOR DELETE
USING (auth.uid() = user_id);

-- Service role: FULL
CREATE POLICY "Service role full open_shipments"
ON public.open_shipments FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ROLLBACK:
-- To revert and restore legacy anonymous access policy:
-- 1) Drop new policies
--    DROP POLICY IF EXISTS "Admin select open_shipments" ON public.open_shipments;
--    DROP POLICY IF EXISTS "Owner select open_shipments" ON public.open_shipments;
--    DROP POLICY IF EXISTS "Owner insert open_shipments" ON public.open_shipments;
--    DROP POLICY IF EXISTS "Owner update open_shipments" ON public.open_shipments;
--    DROP POLICY IF EXISTS "Owner delete open_shipments" ON public.open_shipments;
--    DROP POLICY IF EXISTS "Service role full open_shipments" ON public.open_shipments;
-- 2) Restore prior policies, including anonymous access (not recommended):
--    CREATE POLICY "Users can only access their own open shipments" ON public.open_shipments FOR ALL USING (auth.uid() = user_id);
--    CREATE POLICY "Allow anonymous access for session management" ON public.open_shipments FOR ALL USING (user_id IS NULL);

