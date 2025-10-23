-- ============================================================================
-- create_tabulador_config.sql
-- 
-- PURPOSE: Create table for storing TabuladorMax configuration
-- 
-- EXECUTION: Manual - Run this script in Supabase SQL Editor
-- 
-- DESCRIPTION:
--   Creates the tabulador_config table for storing TabuladorMax connection
--   settings including:
--   - project_id (unique identifier)
--   - url (Supabase URL for TabuladorMax)
--   - publishable_key (anon key)
--   - enabled flag
-- 
--   Includes:
--   - Unique index on project_id to ensure only one config per project
--   - Automatic updated_at trigger
--   - Basic RLS policy (permissive SELECT for authenticated users)
-- 
-- NON-DESTRUCTIVE: Uses IF NOT EXISTS to avoid dropping existing tables
-- 
-- SECURITY NOTE: The RLS policies created here are permissive.
--                Operators should adjust policies according to their
--                security model. Consider stricter policies for INSERT/UPDATE
--                operations to prevent unauthorized config changes.
-- 
-- ============================================================================

-- Create tabulador_config table
CREATE TABLE IF NOT EXISTS public.tabulador_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  url text NOT NULL,
  publishable_key text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index on project_id to ensure one config per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_tabulador_config_project_id 
  ON public.tabulador_config(project_id);

-- Enable RLS
ALTER TABLE public.tabulador_config ENABLE ROW LEVEL SECURITY;

-- Create permissive SELECT policy for authenticated users
-- (Operators should adjust this policy based on their security requirements)
-- Consider creating stricter policies for INSERT/UPDATE operations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tabulador_config'
    AND policyname = 'Allow authenticated users to view tabulador config'
  ) THEN
    CREATE POLICY "Allow authenticated users to view tabulador config"
      ON public.tabulador_config
      FOR SELECT
      TO authenticated
      USING (true);
    RAISE NOTICE 'Created SELECT policy for tabulador_config';
  END IF;
END $$;

-- Optional: Create policy for admins to manage config
-- Uncomment and adjust based on your role structure
/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tabulador_config'
    AND policyname = 'Allow admins to manage tabulador config'
  ) THEN
    CREATE POLICY "Allow admins to manage tabulador config"
      ON public.tabulador_config
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role_id = (SELECT id FROM public.roles WHERE name = 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role_id = (SELECT id FROM public.roles WHERE name = 'admin')
        )
      );
    RAISE NOTICE 'Created admin policy for tabulador_config';
  END IF;
END $$;
*/

-- Comment on table
COMMENT ON TABLE public.tabulador_config IS 
  'Configuration for TabuladorMax external database connection';

COMMENT ON COLUMN public.tabulador_config.project_id IS 
  'Unique identifier for the TabuladorMax project';

COMMENT ON COLUMN public.tabulador_config.url IS 
  'Supabase URL for TabuladorMax instance';

COMMENT ON COLUMN public.tabulador_config.publishable_key IS 
  'Anon/publishable key for TabuladorMax Supabase instance';

COMMENT ON COLUMN public.tabulador_config.enabled IS 
  'Whether synchronization with this TabuladorMax instance is enabled';

-- ============================================================================

-- Create trigger function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to tabulador_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_tabulador_config_updated_at'
    AND tgrelid = 'public.tabulador_config'::regclass
  ) THEN
    CREATE TRIGGER update_tabulador_config_updated_at
      BEFORE UPDATE ON public.tabulador_config
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    RAISE NOTICE 'Created updated_at trigger for tabulador_config';
  END IF;
END $$;

-- ============================================================================

-- Verification query
SELECT 
  id,
  project_id,
  url,
  enabled,
  created_at,
  updated_at
FROM public.tabulador_config
ORDER BY created_at DESC;
