-- QuickLabel RLS Policies (drafts)
-- Purpose: Align to admin SELECT-only, owner CRUD, service_role FULL.
-- NOTE: RLS enable is deferred to PR#1b. Do not enable in this migration.

-- Optional (deferred):
-- ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY; -- enable in PR#1b

-- Cleanup existing policies (idempotent)
DROP POLICY IF EXISTS "Users can view own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Users can create own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.drafts;
DROP POLICY IF EXISTS "Owner select drafts" ON public.drafts;
DROP POLICY IF EXISTS "Owner insert drafts" ON public.drafts;
DROP POLICY IF EXISTS "Owner update drafts" ON public.drafts;
DROP POLICY IF EXISTS "Owner delete drafts" ON public.drafts;
DROP POLICY IF EXISTS "Admin select drafts" ON public.drafts;
DROP POLICY IF EXISTS "Service role full drafts" ON public.drafts;

-- Admin: SELECT only
CREATE POLICY "Admin select drafts"
ON public.drafts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.is_admin = TRUE OR p.role = 'admin')
  )
);

-- Owner: CRUD
CREATE POLICY "Owner select drafts"
ON public.drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner insert drafts"
ON public.drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner update drafts"
ON public.drafts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner delete drafts"
ON public.drafts FOR DELETE
USING (auth.uid() = user_id);

-- Service role: FULL
CREATE POLICY "Service role full drafts"
ON public.drafts FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ROLLBACK:
-- 1) Drop new policies
--    DROP POLICY IF EXISTS "Admin select drafts" ON public.drafts;
--    DROP POLICY IF EXISTS "Owner select drafts" ON public.drafts;
--    DROP POLICY IF EXISTS "Owner insert drafts" ON public.drafts;
--    DROP POLICY IF EXISTS "Owner update drafts" ON public.drafts;
--    DROP POLICY IF EXISTS "Owner delete drafts" ON public.drafts;
--    DROP POLICY IF EXISTS "Service role full drafts" ON public.drafts;
-- 2) Restore previous owner policies if needed (example):
--    CREATE POLICY "Users can view own drafts" ON public.drafts FOR SELECT USING (auth.uid() = user_id);
--    CREATE POLICY "Users can create own drafts" ON public.drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
--    CREATE POLICY "Users can update own drafts" ON public.drafts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--    CREATE POLICY "Users can delete own drafts" ON public.drafts FOR DELETE USING (auth.uid() = user_id);

