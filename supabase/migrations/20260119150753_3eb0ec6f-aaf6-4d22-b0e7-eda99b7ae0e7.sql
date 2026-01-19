-- Prevent casting errors when whatsapp_messages.bitrix_id contains non-numeric values

CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  phone_number TEXT,
  bitrix_id TEXT,
  lead_name TEXT,
  lead_id BIGINT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT,
  last_customer_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  total_messages BIGINT,
  last_operator_name TEXT,
  last_operator_photo_url TEXT,
  lead_etapa TEXT,
  response_status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      wm.phone_number,
      wm.bitrix_id,
      MAX(wm.created_at) AS last_message_at,
      MAX(wm.created_at) FILTER (WHERE wm.direction = 'inbound') AS last_customer_message_at,
      COUNT(*)::BIGINT AS total_messages,
      COUNT(*) FILTER (WHERE wm.direction = 'inbound' AND wm.read_at IS NULL)::BIGINT AS unread_count
    FROM public.whatsapp_messages wm
    GROUP BY wm.phone_number, wm.bitrix_id
  ),
  last_message AS (
    SELECT DISTINCT ON (wm.phone_number, wm.bitrix_id)
      wm.phone_number,
      wm.bitrix_id,
      wm.direction,
      wm.content,
      wm.created_at
    FROM public.whatsapp_messages wm
    ORDER BY wm.phone_number, wm.bitrix_id, wm.created_at DESC
  ),
  last_operator AS (
    SELECT DISTINCT ON (wm.phone_number, wm.bitrix_id)
      wm.phone_number,
      wm.bitrix_id,
      wm.sender_name
    FROM public.whatsapp_messages wm
    WHERE wm.direction = 'outbound'
      AND wm.sender_name IS NOT NULL
      AND wm.sender_name NOT IN ('Flow Automático', 'Bitrix', 'Flow', 'Sistema', 'Bot')
    ORDER BY wm.phone_number, wm.bitrix_id, wm.created_at DESC
  )
  SELECT
    s.phone_number::TEXT,
    s.bitrix_id::TEXT,
    COALESCE(l.name, s.phone_number)::TEXT AS lead_name,
    l.id AS lead_id,
    s.last_message_at,
    LEFT(COALESCE(lm.content, ''), 100)::TEXT AS last_message_preview,
    lm.direction::TEXT AS last_message_direction,
    s.last_customer_message_at,
    s.unread_count,
    s.total_messages,
    lo.sender_name::TEXT AS last_operator_name,
    op.photo_url::TEXT AS last_operator_photo_url,
    l.etapa::TEXT AS lead_etapa,
    CASE
      WHEN s.last_customer_message_at IS NULL THEN 'never'
      WHEN lm.direction = 'outbound' THEN 'replied'
      ELSE 'waiting'
    END::TEXT AS response_status
  FROM stats s
  LEFT JOIN last_message lm
    ON lm.phone_number = s.phone_number AND lm.bitrix_id IS NOT DISTINCT FROM s.bitrix_id
  LEFT JOIN last_operator lo
    ON lo.phone_number = s.phone_number AND lo.bitrix_id IS NOT DISTINCT FROM s.bitrix_id
  -- IMPORTANT: safe cast via CASE to avoid any invalid bigint input
  LEFT JOIN public.leads l
    ON l.id = (CASE WHEN s.bitrix_id ~ '^\d+$' THEN s.bitrix_id::BIGINT ELSE NULL END)
  LEFT JOIN public.telemarketing_operators op
    ON (op.name = lo.sender_name OR op.email = lo.sender_name)
  WHERE
    (
      p_search IS NULL OR p_search = '' OR
      s.phone_number ILIKE '%' || p_search || '%' OR
      COALESCE(l.name, '') ILIKE '%' || p_search || '%' OR
      COALESCE(s.bitrix_id, '') ILIKE '%' || p_search || '%'
    )
    AND (
      p_window_filter IS NULL OR p_window_filter = 'all' OR
      (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours'))
    )
    AND (
      p_response_filter IS NULL OR p_response_filter = 'all' OR
      (p_response_filter = 'waiting' AND s.last_customer_message_at IS NOT NULL AND lm.direction = 'inbound') OR
      (p_response_filter = 'replied' AND s.last_customer_message_at IS NOT NULL AND lm.direction = 'outbound') OR
      (p_response_filter = 'never' AND s.last_customer_message_at IS NULL)
    )
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter
    )
  ORDER BY s.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;