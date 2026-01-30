-- =================================================================
-- 1. Drop e recriar RPC get_my_invited_conversations_full com is_closed
-- =================================================================
DROP FUNCTION IF EXISTS public.get_my_invited_conversations_full(uuid);

CREATE FUNCTION public.get_my_invited_conversations_full(p_operator_id uuid)
RETURNS TABLE(
  phone_number text,
  bitrix_id text,
  priority integer,
  inviter_name text,
  invited_at timestamp with time zone,
  invited_by uuid,
  lead_name text,
  last_message_at timestamp with time zone,
  last_message_preview text,
  is_window_open boolean,
  unread_count bigint,
  lead_etapa text,
  response_status text,
  is_closed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: only allow access to own data
  IF p_operator_id != auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: cannot access other user data';
  END IF;

  RETURN QUERY
  SELECT 
    p.phone_number,
    p.bitrix_id,
    COALESCE(p.priority, 0)::integer as priority,
    p.inviter_name as inviter_name,
    p.invited_at,
    p.invited_by,
    COALESCE(l.name, p.phone_number) as lead_name,
    s.last_message_at,
    s.last_message_preview,
    COALESCE(s.is_window_open, false) as is_window_open,
    COALESCE(s.unread_count, 0) as unread_count,
    l.etapa as lead_etapa,
    s.response_status::text,
    COALESCE(s.is_closed, false) as is_closed
  FROM whatsapp_conversation_participants p
  LEFT JOIN mv_whatsapp_conversation_stats s 
    ON s.phone_number = p.phone_number 
    AND (s.bitrix_id = p.bitrix_id OR (s.bitrix_id IS NULL AND p.bitrix_id IS NULL))
  LEFT JOIN leads l ON l.id = CASE 
    WHEN p.bitrix_id IS NOT NULL AND p.bitrix_id ~ '^[0-9]+$' 
    THEN p.bitrix_id::bigint 
    ELSE NULL 
  END
  WHERE p.operator_id = p_operator_id
  ORDER BY p.priority DESC NULLS LAST, s.last_message_at DESC NULLS LAST;
END;
$function$;

-- =================================================================
-- 2. Criar função get_user_resource_scope para verificar scope de permissão
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_user_resource_scope(
  _user_id uuid,
  _resource_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text := 'none';
  v_user_role app_role;
  v_user_department text;
BEGIN
  -- 1. Verificar permissão direta do usuário
  SELECT pa.scope INTO v_scope
  FROM permission_assignments pa
  JOIN app_resources ar ON ar.id = pa.resource_id
  WHERE pa.assign_type = 'user'
    AND pa.user_id = _user_id
    AND ar.code = _resource_code
    AND pa.can_access = true
  LIMIT 1;
  
  IF v_scope IS NOT NULL AND v_scope != 'none' THEN
    RETURN v_scope;
  END IF;
  
  -- 2. Verificar permissão por departamento
  SELECT ud.department INTO v_user_department
  FROM user_departments ud
  WHERE ud.user_id = _user_id
  LIMIT 1;
  
  IF v_user_department IS NOT NULL THEN
    SELECT pa.scope INTO v_scope
    FROM permission_assignments pa
    JOIN app_resources ar ON ar.id = pa.resource_id
    JOIN departments d ON d.id = pa.department_id
    WHERE pa.assign_type = 'department'
      AND d.code = v_user_department
      AND ar.code = _resource_code
      AND pa.can_access = true
    LIMIT 1;
    
    IF v_scope IS NOT NULL AND v_scope != 'none' THEN
      RETURN v_scope;
    END IF;
  END IF;
  
  -- 3. Verificar permissão por role
  SELECT ur.role INTO v_user_role
  FROM user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;
  
  IF v_user_role IS NOT NULL THEN
    SELECT pa.scope INTO v_scope
    FROM permission_assignments pa
    JOIN app_resources ar ON ar.id = pa.resource_id
    WHERE pa.assign_type = 'role'
      AND pa.role_id IN (SELECT id FROM user_roles WHERE user_id = _user_id)
      AND ar.code = _resource_code
      AND pa.can_access = true
    LIMIT 1;
  END IF;
  
  -- 4. Para admins, retornar global por padrão
  IF has_role(_user_id, 'admin') THEN
    RETURN 'global';
  END IF;
  
  RETURN COALESCE(v_scope, 'none');
END;
$$;