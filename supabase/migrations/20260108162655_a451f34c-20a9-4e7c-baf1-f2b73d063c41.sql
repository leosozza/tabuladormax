-- Drop all overloads of get_telemarketing_conversations to avoid ambiguity
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(integer, integer[], text, integer, integer);
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(integer, integer[], text, integer, integer, text);
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations();

-- Recreate with robust agent resolution
CREATE OR REPLACE FUNCTION public.get_telemarketing_conversations(
  p_operator_bitrix_id integer DEFAULT NULL,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  conv_key text,
  bitrix_id text,
  phone_number text,
  lead_name text,
  photo_url text,
  last_message text,
  last_message_at timestamptz,
  last_message_direction text,
  unread_count bigint,
  is_window_open boolean,
  telemarketing_id integer,
  telemarketing_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      m.phone_number AS m_phone,
      m.bitrix_id AS m_bitrix_id,
      -- Canonical bitrix_id: prefer actual lead id over phone-only
      MAX(m.bitrix_id) FILTER (WHERE m.bitrix_id IS NOT NULL AND m.bitrix_id ~ '^\d+$') 
        OVER (PARTITION BY m.phone_number) AS canonical_bitrix_id,
      m.content,
      m.created_at,
      m.direction,
      m.is_read,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(m.bitrix_id, m.phone_number)
        ORDER BY m.created_at DESC
      ) AS rn
    FROM whatsapp_messages m
    WHERE m.created_at > NOW() - INTERVAL '90 days'
  ),
  conversations AS (
    SELECT DISTINCT ON (COALESCE(r.canonical_bitrix_id, r.m_phone))
      COALESCE(r.canonical_bitrix_id, r.m_phone) AS conv_key,
      r.canonical_bitrix_id AS bitrix_id,
      r.m_phone AS phone_number,
      r.content AS last_message,
      r.created_at AS last_message_at,
      r.direction AS last_message_direction
    FROM ranked r
    WHERE r.rn = 1
    ORDER BY COALESCE(r.canonical_bitrix_id, r.m_phone), r.created_at DESC
  )
  SELECT
    c.conv_key,
    c.bitrix_id,
    c.phone_number,
    COALESCE(l.nome_modelo, l.name, 'Lead ' || COALESCE(c.bitrix_id, c.phone_number))::text AS lead_name,
    l.photo_url::text,
    c.last_message,
    c.last_message_at,
    c.last_message_direction,
    (SELECT COUNT(*) FROM whatsapp_messages wm 
     WHERE COALESCE(wm.bitrix_id, wm.phone_number) = c.conv_key 
       AND wm.direction = 'incoming' 
       AND wm.is_read = false)::bigint AS unread_count,
    COALESCE(
      (SELECT MAX(wm2.created_at) FROM whatsapp_messages wm2 
       WHERE COALESCE(wm2.bitrix_id, wm2.phone_number) = c.conv_key 
         AND wm2.direction = 'incoming') > NOW() - INTERVAL '24 hours',
      false
    ) AS is_window_open,
    COALESCE(l.bitrix_telemarketing_id, NULLIF(l.op_telemarketing, '')::integer)::integer AS telemarketing_id,
    COALESCE(t.bitrix_telemarketing_name, l.telemarketing)::text AS telemarketing_name
  FROM conversations c
  LEFT JOIN leads l ON l.id::text = c.bitrix_id
  LEFT JOIN agent_telemarketing_mapping t 
    ON t.bitrix_telemarketing_id = COALESCE(l.bitrix_telemarketing_id, NULLIF(l.op_telemarketing, '')::integer)
  WHERE
    (p_search IS NULL OR p_search = '' OR 
     COALESCE(l.nome_modelo, l.name, '') ILIKE '%' || p_search || '%' OR
     c.phone_number ILIKE '%' || p_search || '%' OR
     c.bitrix_id ILIKE '%' || p_search || '%')
    AND (
      (p_operator_bitrix_id IS NULL AND p_team_operator_ids IS NULL)
      OR COALESCE(l.bitrix_telemarketing_id, NULLIF(l.op_telemarketing, '')::integer) = p_operator_bitrix_id
      OR COALESCE(l.bitrix_telemarketing_id, NULLIF(l.op_telemarketing, '')::integer) = ANY(p_team_operator_ids)
    )
  ORDER BY c.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;