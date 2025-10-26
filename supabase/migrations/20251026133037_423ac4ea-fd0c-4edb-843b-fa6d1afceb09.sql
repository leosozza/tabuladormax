-- Corrigir função can_access_route
CREATE OR REPLACE FUNCTION public.can_access_route(
  _user_id UUID,
  _route_path TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_dept app_department;
  route_uuid UUID;
  has_permission BOOLEAN;
BEGIN
  -- Buscar role do usuário
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  -- Buscar departamento do usuário
  SELECT department INTO user_dept
  FROM user_departments
  WHERE user_id = _user_id
  LIMIT 1;

  -- Se não encontrou role ou dept, negar acesso
  IF user_role IS NULL OR user_dept IS NULL THEN
    RETURN false;
  END IF;

  -- Buscar ID da rota
  SELECT id INTO route_uuid
  FROM app_routes
  WHERE path = _route_path AND active = true
  LIMIT 1;

  -- Se rota não existe ou não está ativa, permitir (backward compatibility)
  IF route_uuid IS NULL THEN
    RETURN true;
  END IF;

  -- Verificar permissão
  SELECT can_access INTO has_permission
  FROM route_permissions
  WHERE route_permissions.route_id = route_uuid
    AND department = user_dept
    AND role = user_role
  LIMIT 1;

  -- Se não encontrou permissão configurada, negar acesso
  RETURN COALESCE(has_permission, false);
END;
$$;