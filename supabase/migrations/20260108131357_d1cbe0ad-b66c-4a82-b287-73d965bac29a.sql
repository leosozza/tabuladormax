-- Remover políticas permissivas existentes
DROP POLICY IF EXISTS "Authenticated users can view messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can view accessible messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert messages for accessible leads" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update accessible messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Service role full access" ON whatsapp_messages;

-- Criar função para verificar acesso a mensagem via lead
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
  FROM agent_telemarketing_mapping 
  WHERE tabuladormax_user_id = auth.uid();
  
  IF user_mapping IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Buscar lead associado à mensagem pelo bitrix_id
  SELECT * INTO lead_record 
  FROM leads 
  WHERE id::text = message_bitrix_id 
  LIMIT 1;

  -- Se lead não existe pelo ID, tentar pelo telefone
  IF lead_record IS NULL AND message_phone IS NOT NULL THEN
    SELECT * INTO lead_record 
    FROM leads 
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
  SELECT role INTO user_role_val FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

  -- Supervisor: acesso por commercial_project_id ou equipe
  IF user_role_val = 'supervisor' THEN
    RETURN lead_record.commercial_project_id = user_mapping.commercial_project_id
        OR lead_record.bitrix_telemarketing_id IN (
             SELECT atm.bitrix_telemarketing_id 
             FROM agent_telemarketing_mapping atm 
             WHERE atm.supervisor_id = auth.uid()::text
           );
  END IF;

  -- Agent: acesso apenas aos próprios leads
  IF user_role_val = 'agent' THEN
    RETURN lead_record.bitrix_telemarketing_id = user_mapping.bitrix_telemarketing_id;
  END IF;

  RETURN FALSE;
END;
$$;

-- Novas políticas RLS para whatsapp_messages
CREATE POLICY "Users can view accessible messages"
ON whatsapp_messages FOR SELECT
TO authenticated
USING (public.can_access_whatsapp_message(bitrix_id, phone_number));

CREATE POLICY "Users can insert messages for accessible leads"
ON whatsapp_messages FOR INSERT
TO authenticated
WITH CHECK (public.can_access_whatsapp_message(bitrix_id, phone_number));

CREATE POLICY "Users can update accessible messages"
ON whatsapp_messages FOR UPDATE
TO authenticated
USING (public.can_access_whatsapp_message(bitrix_id, phone_number));