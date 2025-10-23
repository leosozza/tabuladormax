-- Step 1: Add user_id column to bitrix_leads if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bitrix_leads' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.bitrix_leads
      ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Step 2: Enable RLS (should already be enabled by existing policies)
ALTER TABLE public.bitrix_leads ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop overly permissive public SELECT policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'bitrix_leads' 
      AND policyname = 'Allow read access to bitrix_leads'
  ) THEN
    DROP POLICY "Allow read access to bitrix_leads" ON public.bitrix_leads;
  END IF;
END $$;

-- Step 4: Create secure policies
-- Allow SELECT for authenticated users only for their own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bitrix_leads' AND policyname = 'Users can view their own leads'
  ) THEN
    CREATE POLICY "Users can view their own leads"
    ON public.bitrix_leads
    FOR SELECT
    TO authenticated
    USING (user_id IS NOT NULL AND auth.uid() = user_id);
  END IF;
END $$;

-- Allow INSERT for authenticated users only and enforce user_id = auth.uid()
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bitrix_leads' AND policyname = 'Allow insert to bitrix_leads for authenticated users'
  ) THEN
    DROP POLICY "Allow insert to bitrix_leads for authenticated users" ON public.bitrix_leads;
  END IF;
  CREATE POLICY "Users can insert their own leads"
  ON public.bitrix_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
END $$;

-- Allow UPDATE for authenticated users on their own rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bitrix_leads' AND policyname = 'Allow update to bitrix_leads for authenticated users'
  ) THEN
    DROP POLICY "Allow update to bitrix_leads for authenticated users" ON public.bitrix_leads;
  END IF;
  CREATE POLICY "Users can update their own leads"
  ON public.bitrix_leads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
END $$;

-- Optional: Disallow DELETE entirely (no policy), or create owner-only delete
-- CREATE POLICY "Users can delete their own leads"
-- ON public.bitrix_leads
-- FOR DELETE
-- TO authenticated
-- USING (auth.uid() = user_id);

-- Step 5: Add helpful index for user_id queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'bitrix_leads' AND indexname = 'idx_bitrix_leads_user_id'
  ) THEN
    CREATE INDEX idx_bitrix_leads_user_id ON public.bitrix_leads (user_id);
  END IF;
END $$;
