-- Dropar função existente e recriar com correção
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
  v_lead_internal_id bigint;
  v_lead_id_text text;
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

  -- Resolver lead interno + seu ID como texto
  IF p_lead_id IS NOT NULL THEN
    v_lead_internal_id := p_lead_id;

    -- CORREÇÃO: usar l.id ao invés de l.bitrix_id (que não existe)
    SELECT l.id::text
      INTO v_lead_id_text
    FROM leads l
    WHERE l.id = v_lead_internal_id
      AND l.bitrix_telemarketing_id = ANY(v_allowed_operators);

    -- Lead não pertence ao operador/time
    IF v_lead_id_text IS NULL THEN
      RETURN;
    END IF;
  ELSIF v_phone_normalized IS NOT NULL THEN
    -- Resolver pelo telefone (fallback)
    SELECT l.id::text
      INTO v_lead_id_text
    FROM leads l
    WHERE l.bitrix_telemarketing_id = ANY(v_allowed_operators)
      AND (
        right(regexp_replace(COALESCE(l.celular, ''), '[^0-9]', '', 'g'), 9) = right(v_phone_normalized, 9)
        OR right(regexp_replace(COALESCE(l.telefone_casa, ''), '[^0-9]', '', 'g'), 9) = right(v_phone_normalized, 9)
        OR right(regexp_replace(COALESCE(l.telefone_trabalho, ''), '[^0-9]', '', 'g'), 9) = right(v_phone_normalized, 9)
      )
    ORDER BY l.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

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
    (v_phone_normalized IS NOT NULL AND right(regexp_replace(m.phone_number, '[^0-9]', '', 'g'), 9) = right(v_phone_normalized, 9))
    OR (v_lead_id_text IS NOT NULL AND m.bitrix_id = v_lead_id_text)
  )
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;