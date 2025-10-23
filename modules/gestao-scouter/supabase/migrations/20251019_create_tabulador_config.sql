-- ============================================================================
-- Migration: Create tabulador_config table
-- ============================================================================
-- Date: 2025-10-19
-- Description: Creates the tabulador_config table to store TabuladorMax
--              external database configuration securely in Supabase.
--              This replaces localStorage-based storage for production use.
-- ============================================================================

-- Create tabulador_config table
CREATE TABLE IF NOT EXISTS public.tabulador_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  url TEXT NOT NULL,
  publishable_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.tabulador_config IS 'Configuration for TabuladorMax external database connection';

-- Enable Row Level Security
ALTER TABLE public.tabulador_config ENABLE ROW LEVEL SECURITY;

-- Create policy: Authenticated users can read configuration
DROP POLICY IF EXISTS "Authenticated users can view tabulador config" ON public.tabulador_config;
CREATE POLICY "Authenticated users can view tabulador config"
  ON public.tabulador_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy: Authenticated users can insert configuration
DROP POLICY IF EXISTS "Authenticated users can create tabulador config" ON public.tabulador_config;
CREATE POLICY "Authenticated users can create tabulador config"
  ON public.tabulador_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy: Authenticated users can update configuration
DROP POLICY IF EXISTS "Authenticated users can update tabulador config" ON public.tabulador_config;
CREATE POLICY "Authenticated users can update tabulador config"
  ON public.tabulador_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy: Service role can do everything
DROP POLICY IF EXISTS "Service role can manage tabulador config" ON public.tabulador_config;
CREATE POLICY "Service role can manage tabulador config"
  ON public.tabulador_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index on enabled flag for quick filtering
CREATE INDEX IF NOT EXISTS idx_tabulador_config_enabled 
  ON public.tabulador_config(enabled) 
  WHERE enabled = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tabulador_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tabulador_config_updated_at_trigger ON public.tabulador_config;
CREATE TRIGGER update_tabulador_config_updated_at_trigger
  BEFORE UPDATE ON public.tabulador_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tabulador_config_updated_at();

-- ============================================================================
-- End of migration
-- ============================================================================
