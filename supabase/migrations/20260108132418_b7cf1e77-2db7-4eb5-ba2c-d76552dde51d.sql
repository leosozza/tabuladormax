-- Fix: supervisor_id é UUID (evitar comparação uuid=text)
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_message(message_bitrix_id TEXT, message_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_record RECORD;
  user_mapping RECORD;
  user_role_val app_role;
BEGIN
  -- Admin e Manager veem tudo
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') THEN
    RETURN TRUE;
  END IF;

  -- Buscar mapping do usuário
  SELECT * INTO user_mapping
  FROM public.agent_telemarketing_mapping
  WHERE tabuladormax_user_id = auth.uid();

  IF user_mapping IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Buscar lead associado à mensagem pelo bitrix_id
  SELECT * INTO lead_record
  FROM public.leads
  WHERE id::text = message_bitrix_id
  LIMIT 1;

  -- Se lead não existe pelo ID, tentar pelo telefone
  IF lead_record IS NULL AND message_phone IS NOT NULL THEN
    SELECT * INTO lead_record
    FROM public.leads
    WHERE celular LIKE '%' || RIGHT(message_phone, 9) || '%'
       OR telefone_casa LIKE '%' || RIGHT(message_phone, 9) || '%'
       OR telefone_trabalho LIKE '%' || RIGHT(message_phone, 9) || '%'
    LIMIT 1;
  END IF;

  -- Se não achou lead, negar acesso
  IF lead_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar role do usuário
  SELECT role INTO user_role_val
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Supervisor: acesso por commercial_project_id ou equipe
  IF user_role_val = 'supervisor' THEN
    RETURN lead_record.commercial_project_id = user_mapping.commercial_project_id
        OR lead_record.bitrix_telemarketing_id IN (
             SELECT atm.bitrix_telemarketing_id
             FROM public.agent_telemarketing_mapping atm
             WHERE atm.supervisor_id = auth.uid()
           );
  END IF;

  -- Agent: acesso apenas aos próprios leads
  IF user_role_val = 'agent' THEN
    RETURN lead_record.bitrix_telemarketing_id = user_mapping.bitrix_telemarketing_id;
  END IF;

  RETURN FALSE;
END;
$$;