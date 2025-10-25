-- Create role_permissions table to assign permissions to roles with scope
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('global','department','own')) DEFAULT 'own',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to prevent duplicate role-permission combinations
CREATE UNIQUE INDEX IF NOT EXISTS ux_role_permission_role_permissionid ON public.role_permissions(role, permission_id);

-- Add comment to table
COMMENT ON TABLE public.role_permissions IS 'Maps permissions to roles with specific scopes (global, department, or own)';
