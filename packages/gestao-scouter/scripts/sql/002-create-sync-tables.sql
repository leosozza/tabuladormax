-- ============================================================================
-- 002-create-sync-tables.sql
-- 
-- PURPOSE: Create missing tables for TabuladorMax synchronization
-- 
-- ISSUE: The sync process was failing with HTTP 406 errors because the
--        required tables (tabulador_config, sync_status, sync_logs_detailed)
--        did not exist in the database.
--
-- SOLUTION: This script creates all three tables needed for the sync process
--           to function properly.
-- 
-- EXECUTION: Run this script in Supabase SQL Editor for gestao-scouter project
-- 
-- ============================================================================

-- Cria as tabelas essenciais para configuração e monitoramento da sincronização.
CREATE TABLE IF NOT EXISTS public.tabulador_config (
  project_id text PRIMARY KEY,
  url text NOT NULL,
  publishable_key text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  last_run_at timestamptz,
  status text CHECK (status IN ('idle','running','error','ok')),
  details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_logs_detailed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text,
  table_name text,
  status text,
  records_count int,
  execution_time_ms int,
  error_message text,
  request_params jsonb,
  response_data jsonb,
  created_at timestamptz DEFAULT now()
);
