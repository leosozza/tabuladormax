-- 1) Remover TODOS os overloads antigos de get_telemarketing_conversations
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations();
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(integer);
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(integer, integer[], text, integer, integer);
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(p_operator_bitrix_id integer);
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(p_operator_bitrix_id integer, p_team_operator_ids integer[], p_search text, p_limit integer, p_offset integer);

-- 2) Recriar get_telemarketing_conversations (versão única e correta)
CREATE OR REPLACE FUNCTION public.get_telemarketing_conversations(
  p_operator_bitrix_id integer DEFAULT NULL,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
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
  WITH 
  -- Agrupar mensagens por telefone e encontrar canonical_lead_id
  phone_leads AS (
    SELECT DISTINCT ON (m.phone_number)
      m.phone_number as pn,
      m.bitrix_id as canonical_bitrix_id
    FROM whatsapp_messages m
    WHERE m.bitrix_id IS NOT NULL 
      AND m.bitrix_id ~ '^\d+$'
    ORDER BY m.phone_number, m.created_at DESC
  ),
  -- Conversas agrupadas
  conversations AS (
    SELECT
      COALESCE(pl.canonical_bitrix_id, m.phone_number) as conv_key,
      m.phone_number as msg_phone,
      MAX(m.created_at) as last_msg_at,
      (array_agg(m.content ORDER BY m.created_at DESC))[1] as last_preview,
      COUNT(*) FILTER (WHERE m.direction = 'inbound' AND m.read_at IS NULL) as unread_cnt,
      MAX(CASE WHEN m.direction = 'inbound' THEN m.created_at END) as last_inbound_at
    FROM whatsapp_messages m
    LEFT JOIN phone_leads pl ON pl.pn = m.phone_number
    WHERE m.phone_number IS NOT NULL
    GROUP BY COALESCE(pl.canonical_bitrix_id, m.phone_number), m.phone_number
  ),
  -- Enriquecer com dados do lead
  enriched AS (
    SELECT
      c.conv_key,
      c.msg_phone,
      c.last_msg_at,
      c.last_preview,
      c.unread_cnt,
      c.last_inbound_at,
      l.id as lead_id_num,
      l.nome_modelo,
      l.photo_url as lead_photo,
      l.bitrix_telemarketing_id,
      l.op_telemarketing,
      l.telemarketing as lead_telemarketing_name
    FROM conversations c
    LEFT JOIN leads l ON l.id::text = c.conv_key
  ),
  -- Resolver nome do agente
  with_agent AS (
    SELECT
      e.*,
      COALESCE(
        t.bitrix_telemarketing_name,
        e.lead_telemarketing_name
      ) as agent_name
    FROM enriched e
    LEFT JOIN agent_telemarketing_mapping t 
      ON t.bitrix_telemarketing_id = COALESCE(
        e.bitrix_telemarketing_id,
        NULLIF(e.op_telemarketing, '')::int
      )
  )
  SELECT
    COALESCE(wa.lead_id_num, 0)::bigint as lead_id,
    wa.conv_key as bitrix_id,
    COALESCE(wa.nome_modelo, 'Lead ' || wa.conv_key) as lead_name,
    wa.msg_phone as phone_number,
    wa.lead_photo as photo_url,
    wa.last_msg_at as last_message_at,
    LEFT(wa.last_preview, 100) as last_message_preview,
    wa.unread_cnt as unread_count,
    (wa.last_inbound_at > NOW() - INTERVAL '24 hours') as window_open,
    wa.agent_name as telemarketing_name,
    0::bigint as conversation_id
  FROM with_agent wa
  WHERE (p_search IS NULL OR p_search = '' OR 
         wa.nome_modelo ILIKE '%' || p_search || '%' OR
         wa.msg_phone LIKE '%' || p_search || '%' OR
         wa.agent_name ILIKE '%' || p_search || '%')
  ORDER BY wa.last_msg_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3) Remover overloads antigos de get_telemarketing_whatsapp_messages
DROP FUNCTION IF EXISTS public.get_telemarketing_whatsapp_messages(integer, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_telemarketing_whatsapp_messages(p_lead_id integer, p_phone_number text, p_limit integer, p_offset integer);

-- 4) Recriar get_telemarketing_whatsapp_messages (versão correta)
CREATE OR REPLACE FUNCTION public.get_telemarketing_whatsapp_messages(
  p_lead_id integer DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  bitrix_id text,
  phone_number text,
  direction text,
  content text,
  media_url text,
  media_type text,
  status text,
  created_at timestamptz,
  read_at timestamptz,
  sender_name text,
  gupshup_message_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_normalized text;
BEGIN
  -- Normalizar telefone (últimos 9 dígitos)
  IF p_phone_number IS NOT NULL THEN
    v_phone_normalized := RIGHT(REGEXP_REPLACE(p_phone_number, '[^0-9]', '', 'g'), 9);
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.bitrix_id,
    m.phone_number,
    m.direction,
    m.content,
    m.media_url,
    m.media_type,
    m.status,
    m.created_at,
    m.read_at,
    m.sender_name,
    m.gupshup_message_id
  FROM whatsapp_messages m
  WHERE 
    -- Buscar por lead_id OU por telefone
    (p_lead_id IS NOT NULL AND m.bitrix_id = p_lead_id::text)
    OR
    (p_lead_id IS NULL AND p_phone_number IS NOT NULL AND (
      m.phone_number = p_phone_number
      OR RIGHT(REGEXP_REPLACE(m.phone_number, '[^0-9]', '', 'g'), 9) = v_phone_normalized
    ))
  ORDER BY m.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;