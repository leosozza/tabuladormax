-- Dropar função existente e recriar SEM validação de permissão
-- A validação de quem vê quais leads acontece na listagem (get_telemarketing_conversations)
-- A visualização de mensagens é livre para qualquer operador autenticado
DROP FUNCTION IF EXISTS public.get_telemarketing_whatsapp_messages(integer,text,bigint,integer[],integer);

CREATE OR REPLACE FUNCTION public.get_telemarketing_whatsapp_messages(
  p_operator_bitrix_id integer,
  p_phone_number text DEFAULT NULL,
  p_lead_id bigint DEFAULT NULL,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  id uuid,
  phone_number text,
  bitrix_id text,
  conversation_id integer,
  gupshup_message_id text,
  direction text,
  message_type text,
  content text,
  template_name text,
  status text,
  sent_by uuid,
  sender_name text,
  media_url text,
  media_type text,
  metadata jsonb,
  created_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id_text text;
  v_phone_normalized text;
BEGIN
  -- Normalizar telefone se fornecido
  IF p_phone_number IS NOT NULL THEN
    v_phone_normalized := regexp_replace(p_phone_number, '[^0-9]', '', 'g');
  END IF;

  -- Converter lead_id para texto se fornecido
  IF p_lead_id IS NOT NULL THEN
    v_lead_id_text := p_lead_id::text;
  END IF;

  -- Buscar mensagens SEM validação de permissão
  -- Parâmetros p_operator_bitrix_id e p_team_operator_ids mantidos para compatibilidade
  -- A validação de quem vê quais leads acontece na listagem (get_telemarketing_conversations)
  RETURN QUERY
  SELECT 
    m.id,
    m.phone_number,
    m.bitrix_id,
    m.conversation_id,
    m.gupshup_message_id,
    m.direction,
    m.message_type,
    m.content,
    m.template_name,
    m.status,
    m.sent_by,
    m.sender_name,
    m.media_url,
    m.media_type,
    m.metadata,
    m.created_at,
    m.delivered_at,
    m.read_at
  FROM whatsapp_messages m
  WHERE (
    -- Buscar por telefone normalizado (últimos 9 dígitos)
    (v_phone_normalized IS NOT NULL 
      AND right(regexp_replace(m.phone_number, '[^0-9]', '', 'g'), 9) = right(v_phone_normalized, 9))
    -- OU buscar por lead_id (armazenado como bitrix_id na tabela)
    OR (v_lead_id_text IS NOT NULL AND m.bitrix_id = v_lead_id_text)
  )
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_telemarketing_whatsapp_messages TO authenticated;