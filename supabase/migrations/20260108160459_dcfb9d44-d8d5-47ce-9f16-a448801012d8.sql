-- Fix: get_telemarketing_conversations estava referenciando colunas inexistentes em leads/agent_telemarketing_mapping
-- Também adiciona um índice por expressão para acelerar o agrupamento por conversa

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_convkey_created
ON public.whatsapp_messages ((COALESCE(bitrix_id, phone_number)), created_at DESC);

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
  WITH ranked AS (
    SELECT
      COALESCE(m.bitrix_id, m.phone_number) AS conv_key,
      m.bitrix_id,
      m.phone_number,
      m.created_at,
      m.content,
      m.conversation_id,
      m.direction,
      m.read_at,
      row_number() OVER (
        PARTITION BY COALESCE(m.bitrix_id, m.phone_number)
        ORDER BY m.created_at DESC
      ) AS rn,
      SUM(
        CASE WHEN m.direction = 'inbound' AND m.read_at IS NULL THEN 1 ELSE 0 END
      ) OVER (
        PARTITION BY COALESCE(m.bitrix_id, m.phone_number)
      ) AS unread_count,
      MAX(
        CASE WHEN m.direction = 'inbound' THEN m.created_at END
      ) OVER (
        PARTITION BY COALESCE(m.bitrix_id, m.phone_number)
      ) AS last_inbound_at
    FROM public.whatsapp_messages m
    WHERE m.phone_number IS NOT NULL
  )
  SELECT
    COALESCE(l.id, 0)::bigint AS lead_id,
    COALESCE(r.bitrix_id, r.phone_number) AS bitrix_id,
    COALESCE(l.nome_modelo, l.name, 'Lead ' || COALESCE(r.bitrix_id, r.phone_number)) AS lead_name,
    r.phone_number,
    l.photo_url AS photo_url,
    r.created_at AS last_message_at,
    r.content AS last_message_preview,
    COALESCE(r.unread_count, 0)::bigint AS unread_count,
    (r.last_inbound_at IS NOT NULL AND r.last_inbound_at > NOW() - INTERVAL '24 hours') AS window_open,
    t.bitrix_telemarketing_name AS telemarketing_name,
    r.conversation_id::bigint AS conversation_id
  FROM ranked r
  LEFT JOIN public.leads l ON l.id::text = r.bitrix_id
  LEFT JOIN public.agent_telemarketing_mapping t ON t.bitrix_telemarketing_id = l.bitrix_telemarketing_id
  WHERE r.rn = 1
    AND (
      p_search IS NULL
      OR COALESCE(l.nome_modelo, l.name, '') ILIKE '%' || p_search || '%'
      OR r.phone_number LIKE '%' || p_search || '%'
    )
  ORDER BY r.created_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;