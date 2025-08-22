-- Enable RLS on profiles and restrict all operations to the row owner

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid duplicates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "profiles_owner_all" ON public.profiles';
  END IF;
END $$;

-- Single policy covering SELECT/INSERT/UPDATE/DELETE
CREATE POLICY "profiles_owner_all"
ON public.profiles
FOR ALL
USING ( id = auth.uid() )
WITH CHECK ( id = auth.uid() );


