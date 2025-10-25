-- Helper function to check if a user has a specific permission
-- This can be used in RLS policies or application code
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user's role from users table
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;
  
  -- Admin always has all permissions
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user's role has the requested permission
  SELECT EXISTS(
    SELECT 1
    FROM public.permissions p
    INNER JOIN public.role_permissions rp ON p.id = rp.permission_id
    WHERE p.resource = p_resource
      AND p.action = p_action
      AND rp.role = v_user_role
  ) INTO v_has_permission;
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$;

-- Helper function to check if a user can access a specific route
-- This checks the route_permissions table
CREATE OR REPLACE FUNCTION public.user_can_access_route(
  p_user_id UUID,
  p_route_path TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_user_department TEXT;
  v_route_id UUID;
  v_can_access BOOLEAN;
BEGIN
  -- Get user's role and department
  SELECT role, department INTO v_user_role, v_user_department
  FROM public.users
  WHERE id = p_user_id;
  
  -- Admin can access all routes
  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Get route ID
  SELECT id INTO v_route_id
  FROM public.app_routes
  WHERE path = p_route_path AND active = TRUE;
  
  -- Route doesn't exist or is inactive
  IF v_route_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has access based on department and role
  SELECT EXISTS(
    SELECT 1
    FROM public.route_permissions
    WHERE route_id = v_route_id
      AND allowed = TRUE
      AND (
        (department = v_user_department AND role = v_user_role) OR
        (department = v_user_department AND role IS NULL) OR
        (department IS NULL AND role = v_user_role)
      )
  ) INTO v_can_access;
  
  RETURN COALESCE(v_can_access, FALSE);
END;
$$;

-- Add comments to functions
COMMENT ON FUNCTION public.user_has_permission(UUID, TEXT, TEXT) IS 
  'Checks if a user has a specific resource permission based on their role';

COMMENT ON FUNCTION public.user_can_access_route(UUID, TEXT) IS 
  'Checks if a user can access a specific route based on route_permissions table';
