-- Secure bitrix_leads: require authentication for SELECT without breaking existing policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bitrix_leads'
  ) THEN
    -- Ensure RLS is enabled (idempotent when executed via dynamic SQL)
    EXECUTE 'ALTER TABLE public.bitrix_leads ENABLE ROW LEVEL SECURITY';

    -- Add a RESTRICTIVE SELECT policy that requires authentication
    -- This ANDs with any existing (permissive) policies to prevent anon reads
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'bitrix_leads'
        AND policyname = 'Require auth for reading leads (restrictive)'
    ) THEN
      EXECUTE $$
        CREATE POLICY "Require auth for reading leads (restrictive)"
        AS RESTRICTIVE
        ON public.bitrix_leads
        FOR SELECT
        USING (auth.role() = 'authenticated');
      $$;
    END IF;
  END IF;
END $$;