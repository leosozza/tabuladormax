-- Create app_routes table for managing application routes/pages
CREATE TABLE IF NOT EXISTS public.app_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  name TEXT,
  description TEXT,
  module TEXT,
  active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  icon TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient filtering by module
CREATE INDEX IF NOT EXISTS idx_app_routes_module ON public.app_routes(module);

-- Add comment to table
COMMENT ON TABLE public.app_routes IS 'Stores application routes/pages for permission management';
