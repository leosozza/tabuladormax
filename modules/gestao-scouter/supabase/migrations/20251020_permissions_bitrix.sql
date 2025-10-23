-- ============================================================================
-- 20251005_permissions_bitrix.sql
-- RPCs para gerenciamento de permissões (modelo Bitrix24)
-- ============================================================================

-- RPC: list_permissions
-- Lista todas as permissões do sistema agrupadas por role
CREATE OR REPLACE FUNCTION public.list_permissions()
RETURNS TABLE (
  id INT,
  module TEXT,
  action TEXT,
  role_id INT,
  role_name TEXT,
  allowed BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.module,
    p.action,
    p.role_id,
    r.name AS role_name,
    p.allowed,
    p.created_at
  FROM public.permissions p
  JOIN public.roles r ON r.id = p.role_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY r.name, p.module, p.action;
$$;

-- RPC: set_permission
-- Define ou atualiza uma permissão para um role específico
CREATE OR REPLACE FUNCTION public.set_permission(
  target_module TEXT,
  target_action TEXT,
  target_role_id INT,
  is_allowed BOOLEAN
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
    RAISE EXCEPTION 'Apenas administradores podem gerenciar permissões';
  END IF;
  
  -- Verificar se o role existe
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = target_role_id) THEN
    RAISE EXCEPTION 'Role ID % não existe', target_role_id;
  END IF;
  
  -- Insert or update permission
  INSERT INTO public.permissions (module, action, role_id, allowed)
  VALUES (target_module, target_action, target_role_id, is_allowed)
  ON CONFLICT (module, action, role_id) 
  DO UPDATE SET 
    allowed = EXCLUDED.allowed;
  
  RETURN TRUE;
END;
$$;

-- RPC: get_user_permissions_by_module
-- Retorna as permissões do usuário atual agrupadas por módulo
CREATE OR REPLACE FUNCTION public.get_user_permissions_by_module()
RETURNS TABLE (
  module TEXT,
  actions JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.module,
    jsonb_object_agg(p.action, p.allowed) AS actions
  FROM public.users u
  JOIN public.permissions p ON p.role_id = u.role_id
  WHERE u.id = auth.uid()
  GROUP BY p.module;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.list_permissions IS 'Lista todas as permissões do sistema. Disponível para usuários autenticados.';
COMMENT ON FUNCTION public.set_permission IS 'Define ou atualiza uma permissão. Apenas para admins.';
COMMENT ON FUNCTION public.get_user_permissions_by_module IS 'Retorna as permissões do usuário atual agrupadas por módulo.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.list_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_permission(TEXT, TEXT, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions_by_module() TO authenticated;
