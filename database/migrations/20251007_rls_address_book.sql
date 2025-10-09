-- QuickLabel RLS Policies (address_book)
-- Purpose: Align to admin SELECT-only, owner CRUD, service_role FULL.
-- NOTE: RLS enable is deferred to PR#1b. Do not enable in this migration.

-- Optional (deferred):
-- ALTER TABLE public.address_book ENABLE ROW LEVEL SECURITY; -- enable in PR#1b

-- Cleanup existing/legacy policies (idempotent)
DROP POLICY IF EXISTS "Users can access own address book" ON public.address_book;
DROP POLICY IF EXISTS "Users can access their own address book" ON public.address_book;
DROP POLICY IF EXISTS "Owner select address_book" ON public.address_book;
DROP POLICY IF EXISTS "Owner insert address_book" ON public.address_book;
DROP POLICY IF EXISTS "Owner update address_book" ON public.address_book;
DROP POLICY IF EXISTS "Owner delete address_book" ON public.address_book;
DROP POLICY IF EXISTS "Admin select address_book" ON public.address_book;
DROP POLICY IF EXISTS "Service role full address_book" ON public.address_book;

-- Admin: SELECT only
CREATE POLICY "Admin select address_book"
ON public.address_book FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.is_admin = TRUE OR p.role = 'admin')
  )
);

-- Owner: CRUD
CREATE POLICY "Owner select address_book"
ON public.address_book FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner insert address_book"
ON public.address_book FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner update address_book"
ON public.address_book FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner delete address_book"
ON public.address_book FOR DELETE
USING (auth.uid() = user_id);

-- Service role: FULL
CREATE POLICY "Service role full address_book"
ON public.address_book FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ROLLBACK:
-- 1) Drop new policies
--    DROP POLICY IF EXISTS "Admin select address_book" ON public.address_book;
--    DROP POLICY IF EXISTS "Owner select address_book" ON public.address_book;
--    DROP POLICY IF EXISTS "Owner insert address_book" ON public.address_book;
--    DROP POLICY IF EXISTS "Owner update address_book" ON public.address_book;
--    DROP POLICY IF EXISTS "Owner delete address_book" ON public.address_book;
--    DROP POLICY IF EXISTS "Service role full address_book" ON public.address_book;
-- 2) Optionally restore previous policies if needed (example):
--    CREATE POLICY "Users can access their own address book" ON public.address_book FOR ALL USING (auth.uid() = user_id);

