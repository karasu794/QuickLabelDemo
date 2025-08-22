-- Ensure org_id and created_by columns exist and are constrained

DO $$
BEGIN
  -- org_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'address_book' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.address_book ADD COLUMN org_id uuid;
  END IF;

  -- created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'address_book' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.address_book ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Set NOT NULL on org_id
  BEGIN
    ALTER TABLE public.address_book ALTER COLUMN org_id SET NOT NULL;
  EXCEPTION WHEN others THEN
    -- If fails due to existing nulls, caller should backfill before enforcing
    RAISE NOTICE 'Could not set NOT NULL on org_id. Please backfill existing rows.';
  END;
END $$;

-- Enable RLS
ALTER TABLE public.address_book ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'address_book'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "address_book_org_all" ON public.address_book';
  END IF;
END $$;

-- Policy: allow access only if user belongs to the same org
CREATE POLICY "address_book_org_all"
ON public.address_book
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = address_book.org_id AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = address_book.org_id AND m.user_id = auth.uid()
  )
);


