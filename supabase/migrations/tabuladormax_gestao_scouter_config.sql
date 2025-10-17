-- ============================================================================
-- TabuladorMax - Gestão Scouter Configuration Table
-- ============================================================================
-- Migration: Complete setup for gestao_scouter_config table
-- Description: Creates configuration table for Gestão Scouter integration
--              with RLS policies, triggers, indexes, and constraints
-- ============================================================================

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS public.gestao_scouter_config CASCADE;

-- ============================================================================
-- 1. TABLE CREATION
-- ============================================================================

CREATE TABLE public.gestao_scouter_config (
  id SERIAL PRIMARY KEY,
  project_url TEXT NOT NULL 
    CONSTRAINT project_url_format_check 
    CHECK (project_url ~* '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'),
  anon_key TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.gestao_scouter_config IS 
  'Configuration table for Gestão Scouter integration - stores connection and sync settings';

COMMENT ON COLUMN public.gestao_scouter_config.id IS 
  'Sequential unique identifier';

COMMENT ON COLUMN public.gestao_scouter_config.project_url IS 
  'Supabase project URL for gestao-scouter (e.g., https://xxx.supabase.co)';

COMMENT ON COLUMN public.gestao_scouter_config.anon_key IS 
  'Anonymous key (anon key) for the project - used for public API access';

COMMENT ON COLUMN public.gestao_scouter_config.active IS 
  'Indicates if this configuration is currently active';

COMMENT ON COLUMN public.gestao_scouter_config.sync_enabled IS 
  'Indicates if synchronization is enabled for this configuration';

COMMENT ON COLUMN public.gestao_scouter_config.created_at IS 
  'Timestamp when the configuration was created';

COMMENT ON COLUMN public.gestao_scouter_config.updated_at IS 
  'Timestamp when the configuration was last updated';

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.gestao_scouter_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow SELECT for everyone (public read access)
CREATE POLICY "Allow public SELECT on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR SELECT
  USING (true);

-- Policy: Allow INSERT for authenticated users and service_role
CREATE POLICY "Allow authenticated INSERT on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Policy: Allow UPDATE for authenticated users and service_role
CREATE POLICY "Allow authenticated UPDATE on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow DELETE for authenticated users and service_role
CREATE POLICY "Allow authenticated DELETE on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR DELETE
  TO authenticated, service_role
  USING (true);

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Create function for updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically update updated_at on record modification
CREATE TRIGGER update_gestao_scouter_config_updated_at
  BEFORE UPDATE ON public.gestao_scouter_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- Index for active configuration lookup
CREATE INDEX idx_gestao_scouter_config_active 
  ON public.gestao_scouter_config(active)
  WHERE active = true;

-- Index for sync_enabled lookup
CREATE INDEX idx_gestao_scouter_config_sync_enabled 
  ON public.gestao_scouter_config(sync_enabled)
  WHERE sync_enabled = true;

-- Composite index for active and sync_enabled
CREATE INDEX idx_gestao_scouter_config_active_sync 
  ON public.gestao_scouter_config(active, sync_enabled)
  WHERE active = true AND sync_enabled = true;

-- ============================================================================
-- 6. CONSTRAINTS
-- ============================================================================

-- Function to enforce only one active record
CREATE OR REPLACE FUNCTION enforce_single_active_config()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to set active = true, deactivate all other records
  IF NEW.active = true THEN
    UPDATE public.gestao_scouter_config 
    SET active = false 
    WHERE id != NEW.id AND active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one active configuration
CREATE TRIGGER ensure_single_active_gestao_scouter_config
  BEFORE INSERT OR UPDATE ON public.gestao_scouter_config
  FOR EACH ROW
  WHEN (NEW.active = true)
  EXECUTE FUNCTION enforce_single_active_config();

-- ============================================================================
-- 7. INITIAL DATA
-- ============================================================================

-- Insert example configuration (inactive by default)
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://example.supabase.co',
  'your-anon-key-here',
  false,
  false
);

-- Add comment for the example record
COMMENT ON TABLE public.gestao_scouter_config IS 
  'Configuration table for Gestão Scouter integration. 
  Initial example record provided - update with actual values before activating.
  Only one configuration can be active at a time.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
