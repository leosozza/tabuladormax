-- Create route_permissions table for page-level access control
CREATE TABLE IF NOT EXISTS public.route_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.app_routes(id) ON DELETE CASCADE,
  department TEXT NULL,
  role TEXT NULL,
  allowed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookups by route
CREATE INDEX IF NOT EXISTS idx_route_permissions_routeid ON public.route_permissions(route_id);

-- Add comment to table
COMMENT ON TABLE public.route_permissions IS 'Defines access permissions for routes by department and role';
