-- Simplificar RPC get_telemarketing_conversations - sem filtros de operador
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(integer, integer[], text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_telemarketing_conversations(
  p_operator_bitrix_id integer DEFAULT NULL,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  lead_id bigint,
  bitrix_id text,
  lead_name text,
  phone_number text,
  photo_url text,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count bigint,
  window_open boolean,
  telemarketing_name text,
  conversation_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH distinct_conversations AS (
    SELECT DISTINCT ON (COALESCE(m.bitrix_id, m.phone_number))
      m.bitrix_id,
      m.phone_number,
      m.created_at as last_message_at,
      m.content as last_message_preview,
      m.conversation_id,
      m.direction
    FROM whatsapp_messages m
    WHERE m.phone_number IS NOT NULL
    ORDER BY COALESCE(m.bitrix_id, m.phone_number), m.created_at DESC
  )
  SELECT 
    COALESCE(l.id, 0)::bigint as lead_id,
    COALESCE(dc.bitrix_id, dc.phone_number) as bitrix_id,
    COALESCE(l.nome_modelo, l.name, 'Lead ' || COALESCE(dc.bitrix_id, dc.phone_number)) as lead_name,
    dc.phone_number,
    l.foto_lead as photo_url,
    dc.last_message_at,
    dc.last_message_preview,
    (SELECT COUNT(*) FROM whatsapp_messages wm 
     WHERE (wm.bitrix_id = dc.bitrix_id OR wm.phone_number = dc.phone_number)
     AND wm.direction = 'inbound' AND wm.read_at IS NULL)::bigint as unread_count,
    (SELECT MAX(wm2.created_at) > NOW() - INTERVAL '24 hours' 
     FROM whatsapp_messages wm2 
     WHERE (wm2.bitrix_id = dc.bitrix_id OR wm2.phone_number = dc.phone_number)
     AND wm2.direction = 'inbound') as window_open,
    t.name as telemarketing_name,
    dc.conversation_id
  FROM distinct_conversations dc
  LEFT JOIN leads l ON l.id::text = dc.bitrix_id
  LEFT JOIN agent_telemarketing_mapping t ON t.bitrix_telemarketing_id = l.bitrix_telemarketing_id
  WHERE (p_search IS NULL OR 
         COALESCE(l.nome_modelo, l.name, '') ILIKE '%' || p_search || '%' OR 
         dc.phone_number LIKE '%' || p_search || '%')
  ORDER BY dc.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Simplificar RPC get_telemarketing_whatsapp_messages - busca direta sem filtros
DROP FUNCTION IF EXISTS public.get_telemarketing_whatsapp_messages(integer, text, integer, integer[], integer);

CREATE OR REPLACE FUNCTION public.get_telemarketing_whatsapp_messages(
  p_operator_bitrix_id integer DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_lead_id integer DEFAULT NULL,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  id uuid,
  phone_number text,
  bitrix_id text,
  gupshup_message_id text,
  direction text,
  message_type text,
  content text,
  template_name text,
  status text,
  media_url text,
  media_type text,
  created_at timestamptz,
  read_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  -- Normalizar telefone
  v_phone := NULLIF(REGEXP_REPLACE(COALESCE(p_phone_number, ''), '\D', '', 'g'), '');
  
  RETURN QUERY
  SELECT 
    m.id,
    m.phone_number,
    m.bitrix_id,
    m.gupshup_message_id,
    m.direction,
    m.message_type,
    m.content,
    m.template_name,
    m.status,
    m.media_url,
    m.media_mime_type as media_type,
    m.created_at,
    m.read_at,
    m.metadata
  FROM whatsapp_messages m
  WHERE 
    (p_lead_id IS NOT NULL AND m.bitrix_id = p_lead_id::text)
    OR (v_phone IS NOT NULL AND v_phone != '' AND (
      m.phone_number = v_phone 
      OR RIGHT(m.phone_number, 9) = RIGHT(v_phone, 9)
    ))
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;