-- RPC para buscar mensagens do WhatsApp com validação de acesso telemarketing
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
  direction text,
  content text,
  message_type text,
  media_url text,
  media_mime_type text,
  status text,
  read_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  gupshup_message_id text,
  template_name text,
  template_params jsonb,
  location_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id bigint;
  v_phone_normalized text;
  v_allowed_operators integer[];
BEGIN
  -- Montar array de operadores permitidos
  IF p_team_operator_ids IS NOT NULL AND array_length(p_team_operator_ids, 1) > 0 THEN
    v_allowed_operators := p_team_operator_ids;
    IF NOT (p_operator_bitrix_id = ANY(v_allowed_operators)) THEN
      v_allowed_operators := array_append(v_allowed_operators, p_operator_bitrix_id);
    END IF;
  ELSE
    v_allowed_operators := ARRAY[p_operator_bitrix_id];
  END IF;

  -- Normalizar telefone
  IF p_phone_number IS NOT NULL THEN
    v_phone_normalized := regexp_replace(p_phone_number, '[^0-9]', '', 'g');
  END IF;

  -- Resolver lead_id se não foi passado
  IF p_lead_id IS NOT NULL THEN
    v_lead_id := p_lead_id;
  ELSIF v_phone_normalized IS NOT NULL THEN
    SELECT l.id INTO v_lead_id
    FROM leads l
    WHERE l.bitrix_telemarketing_id = ANY(v_allowed_operators)
      AND (
        regexp_replace(COALESCE(l.celular, ''), '[^0-9]', '', 'g') LIKE '%' || right(v_phone_normalized, 9)
        OR regexp_replace(COALESCE(l.telefone_casa, ''), '[^0-9]', '', 'g') LIKE '%' || right(v_phone_normalized, 9)
        OR regexp_replace(COALESCE(l.telefone_trabalho, ''), '[^0-9]', '', 'g') LIKE '%' || right(v_phone_normalized, 9)
        OR regexp_replace(COALESCE(l.phone_normalized, ''), '[^0-9]', '', 'g') LIKE '%' || right(v_phone_normalized, 9)
      )
    ORDER BY l.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- Verificar se o lead pertence a um operador permitido
  IF v_lead_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = v_lead_id
        AND l.bitrix_telemarketing_id = ANY(v_allowed_operators)
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- Buscar mensagens pelo telefone normalizado
  RETURN QUERY
  SELECT 
    m.id,
    m.phone_number,
    m.bitrix_id,
    m.direction,
    m.content,
    m.message_type,
    m.media_url,
    m.media_mime_type,
    m.status,
    m.read_at,
    m.created_at,
    m.updated_at,
    m.gupshup_message_id,
    m.template_name,
    m.template_params,
    m.location_data
  FROM whatsapp_messages m
  WHERE (
    (v_phone_normalized IS NOT NULL AND 
     right(regexp_replace(m.phone_number, '[^0-9]', '', 'g'), 9) = right(v_phone_normalized, 9))
    OR (v_lead_id IS NOT NULL AND m.bitrix_id = v_lead_id::text)
  )
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;

-- RPC para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION public.mark_telemarketing_whatsapp_messages_read(
  p_operator_bitrix_id integer,
  p_message_ids uuid[],
  p_team_operator_ids integer[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_operators integer[];
  v_updated_count integer;
BEGIN
  IF p_team_operator_ids IS NOT NULL AND array_length(p_team_operator_ids, 1) > 0 THEN
    v_allowed_operators := p_team_operator_ids;
    IF NOT (p_operator_bitrix_id = ANY(v_allowed_operators)) THEN
      v_allowed_operators := array_append(v_allowed_operators, p_operator_bitrix_id);
    END IF;
  ELSE
    v_allowed_operators := ARRAY[p_operator_bitrix_id];
  END IF;

  WITH accessible_messages AS (
    SELECT m.id
    FROM whatsapp_messages m
    JOIN leads l ON l.id::text = m.bitrix_id
    WHERE m.id = ANY(p_message_ids)
      AND m.direction = 'inbound'
      AND m.read_at IS NULL
      AND l.bitrix_telemarketing_id = ANY(v_allowed_operators)
  )
  UPDATE whatsapp_messages
  SET 
    read_at = now(),
    status = 'read'
  WHERE id IN (SELECT id FROM accessible_messages);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_telemarketing_whatsapp_messages TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_telemarketing_whatsapp_messages_read TO anon, authenticated;