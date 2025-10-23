-- ============================================================================
-- create_sync_tables.sql
-- 
-- PURPOSE: Create tables for tracking synchronization status and logs
-- 
-- EXECUTION: Manual - Run this script in Supabase SQL Editor
-- 
-- DESCRIPTION:
--   Creates two tables for sync monitoring:
--   1. sync_logs_detailed - Detailed logs of sync operations
--   2. sync_status - Current sync status for each project
-- 
--   Both tables include:
--   - Basic RLS policies (permissive SELECT for authenticated users)
--   - Automatic updated_at triggers
--   - UUID primary keys
-- 
-- NON-DESTRUCTIVE: Uses IF NOT EXISTS to avoid dropping existing tables
-- 
-- SECURITY NOTE: The RLS policies created here are permissive.
--                Operators should adjust policies according to their
--                security model and requirements.
-- 
-- ============================================================================

-- Table 1: sync_logs_detailed
-- Stores detailed logs of each sync operation
CREATE TABLE IF NOT EXISTS public.sync_logs_detailed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  table_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  request_params jsonb,
  response_data jsonb,
  error_message text,
  records_count integer,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_detailed_created_at 
  ON public.sync_logs_detailed(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_detailed_status 
  ON public.sync_logs_detailed(status);

CREATE INDEX IF NOT EXISTS idx_sync_logs_detailed_table_name 
  ON public.sync_logs_detailed(table_name);

-- Enable RLS
ALTER TABLE public.sync_logs_detailed ENABLE ROW LEVEL SECURITY;

-- Create permissive SELECT policy for authenticated users
-- (Operators should adjust this policy based on their security requirements)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'sync_logs_detailed'
    AND policyname = 'Allow authenticated users to view sync logs'
  ) THEN
    CREATE POLICY "Allow authenticated users to view sync logs"
      ON public.sync_logs_detailed
      FOR SELECT
      TO authenticated
      USING (true);
    RAISE NOTICE 'Created SELECT policy for sync_logs_detailed';
  END IF;
END $$;

-- Comment on table
COMMENT ON TABLE public.sync_logs_detailed IS 
  'Detailed logs of synchronization operations between Gestão Scouter and TabuladorMax';

-- ============================================================================

-- Table 2: sync_status
-- Stores the current synchronization status for each project
CREATE TABLE IF NOT EXISTS public.sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL UNIQUE,
  last_sync_at timestamptz,
  last_sync_success boolean,
  total_records integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS idx_sync_status_project_name 
  ON public.sync_status(project_name);

-- Enable RLS
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Create permissive SELECT policy for authenticated users
-- (Operators should adjust this policy based on their security requirements)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'sync_status'
    AND policyname = 'Allow authenticated users to view sync status'
  ) THEN
    CREATE POLICY "Allow authenticated users to view sync status"
      ON public.sync_status
      FOR SELECT
      TO authenticated
      USING (true);
    RAISE NOTICE 'Created SELECT policy for sync_status';
  END IF;
END $$;

-- Comment on table
COMMENT ON TABLE public.sync_status IS 
  'Current synchronization status for projects syncing with TabuladorMax';

-- ============================================================================

-- Create trigger function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to sync_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_sync_status_updated_at'
    AND tgrelid = 'public.sync_status'::regclass
  ) THEN
    CREATE TRIGGER update_sync_status_updated_at
      BEFORE UPDATE ON public.sync_status
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    RAISE NOTICE 'Created updated_at trigger for sync_status';
  END IF;
END $$;

-- ============================================================================

-- Verification query
SELECT 
  'sync_logs_detailed' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('public.sync_logs_detailed')) AS table_size
FROM public.sync_logs_detailed
UNION ALL
SELECT 
  'sync_status' AS table_name,
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('public.sync_status')) AS table_size
FROM public.sync_status;
