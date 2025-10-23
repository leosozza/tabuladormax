-- ============================================================================
-- 20251005_users_roles.sql
-- RPCs para gerenciamento seguro de usuários e roles
-- ============================================================================

-- RPC: list_users_admin
-- Lista todos os usuários com suas roles (apenas para admins)
CREATE OR REPLACE FUNCTION public.list_users_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role_id INT,
  role_name TEXT,
  scouter_id BIGINT,
  supervisor_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id,
    u.name,
    u.email,
    u.role_id,
    r.name AS role_name,
    u.scouter_id,
    u.supervisor_id,
    u.created_at,
    u.updated_at
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE public.get_user_role(auth.uid()) = 'admin'
  ORDER BY u.name;
$$;

-- RPC: update_user_role
-- Atualiza o role de um usuário (apenas para admins)
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role_id INT,
  new_scouter_id BIGINT DEFAULT NULL,
  new_supervisor_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Verificar se o usuário atual é admin
  SELECT public.get_user_role(auth.uid()) INTO caller_role;
  
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles de usuários';
  END IF;
  
  -- Verificar se o role existe
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = new_role_id) THEN
    RAISE EXCEPTION 'Role ID % não existe', new_role_id;
  END IF;
  
  -- Atualizar o usuário
  UPDATE public.users
  SET 
    role_id = new_role_id,
    scouter_id = COALESCE(new_scouter_id, scouter_id),
    supervisor_id = new_supervisor_id,
    updated_at = now()
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.list_users_admin IS 'Lista todos os usuários com suas roles. Apenas para admins.';
COMMENT ON FUNCTION public.update_user_role IS 'Atualiza role, scouter_id e supervisor_id de um usuário. Apenas para admins.';

-- Grant execute permissions to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION public.list_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, INT, BIGINT, UUID) TO authenticated;
