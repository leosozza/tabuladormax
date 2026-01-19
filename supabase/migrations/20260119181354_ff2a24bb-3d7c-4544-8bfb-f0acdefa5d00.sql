-- Create materialized view for WhatsApp conversation statistics
-- This pre-calculates aggregations to avoid expensive GROUP BY on 95k+ messages

DROP MATERIALIZED VIEW IF EXISTS mv_whatsapp_conversation_stats CASCADE;

CREATE MATERIALIZED VIEW mv_whatsapp_conversation_stats AS
SELECT
  phone_number,
  bitrix_id,
  MAX(created_at) AS last_message_at,
  MAX(created_at) FILTER (WHERE direction = 'inbound') AS last_customer_message_at,
  COUNT(*)::BIGINT AS total_messages,
  COUNT(*) FILTER (WHERE direction = 'inbound' AND read_at IS NULL)::BIGINT AS unread_count,
  (array_agg(content ORDER BY created_at DESC))[1] AS last_message_preview,
  (array_agg(direction ORDER BY created_at DESC))[1] AS last_message_direction
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY phone_number, bitrix_id;

-- Create unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_whatsapp_stats_unique 
ON mv_whatsapp_conversation_stats (phone_number, COALESCE(bitrix_id, ''));

-- Index for sorting by last message
CREATE INDEX idx_mv_whatsapp_stats_last_message 
ON mv_whatsapp_conversation_stats (last_message_at DESC);

-- Index for filtering by last customer message (window status)
CREATE INDEX idx_mv_whatsapp_stats_customer_message 
ON mv_whatsapp_conversation_stats (last_customer_message_at DESC NULLS LAST);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_whatsapp_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_whatsapp_conversation_stats;
END;
$$;

-- Rewrite get_admin_whatsapp_conversations to use materialized view
CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
  p_limit INTEGER DEFAULT 30,
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_cutoff TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
BEGIN
  RETURN QUERY
  SELECT
    s.phone_number::TEXT,
    s.bitrix_id::TEXT,
    l.nome::TEXT AS lead_name,
    l.id AS lead_id,
    s.last_message_at,
    s.last_message_preview::TEXT,
    s.last_message_direction::TEXT,
    s.last_customer_message_at,
    s.unread_count,
    s.total_messages,
    COALESCE(op.nome, atm.bitrix_telemarketing_name)::TEXT AS last_operator_name,
    op.photo_url::TEXT AS last_operator_photo_url,
    l.etapa::TEXT AS lead_etapa,
    CASE
      WHEN s.last_message_direction = 'inbound' AND s.unread_count > 0 THEN 'waiting'
      WHEN s.last_customer_message_at IS NULL THEN 'never'
      ELSE 'replied'
    END::TEXT AS response_status
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON (
    CASE WHEN s.bitrix_id ~ '^\d+$' THEN s.bitrix_id::BIGINT ELSE NULL END = l.bitrix_id
  )
  LEFT JOIN agent_telemarketing_mapping atm ON l.bitrix_telemarketing_id = atm.bitrix_telemarketing_id
  LEFT JOIN profiles op ON atm.tabuladormax_user_id = op.id
  WHERE
    -- Search filter
    (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR
      COALESCE(l.nome, '') ILIKE '%' || p_search || '%' OR
      s.bitrix_id ILIKE '%' || p_search || '%'
    )
    -- Window filter
    AND (
      COALESCE(p_window_filter, 'all') = 'all' OR
      (p_window_filter = 'open' AND s.last_customer_message_at > window_cutoff) OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= window_cutoff))
    )
    -- Response filter
    AND (
      COALESCE(p_response_filter, 'all') = 'all' OR
      (p_response_filter = 'waiting' AND s.last_message_direction = 'inbound' AND s.unread_count > 0) OR
      (p_response_filter = 'never' AND s.last_customer_message_at IS NULL) OR
      (p_response_filter = 'replied' AND s.last_message_direction = 'outbound')
    )
    -- Etapa filter
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR p_etapa_filter = 'all' OR
      l.etapa = p_etapa_filter
    )
  ORDER BY s.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Rewrite count function to use materialized view
CREATE OR REPLACE FUNCTION count_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BIGINT;
  window_cutoff TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
BEGIN
  SELECT COUNT(*)
  INTO result
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON (
    CASE WHEN s.bitrix_id ~ '^\d+$' THEN s.bitrix_id::BIGINT ELSE NULL END = l.bitrix_id
  )
  WHERE
    -- Search filter
    (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR
      COALESCE(l.nome, '') ILIKE '%' || p_search || '%' OR
      s.bitrix_id ILIKE '%' || p_search || '%'
    )
    -- Window filter
    AND (
      COALESCE(p_window_filter, 'all') = 'all' OR
      (p_window_filter = 'open' AND s.last_customer_message_at > window_cutoff) OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= window_cutoff))
    )
    -- Response filter
    AND (
      COALESCE(p_response_filter, 'all') = 'all' OR
      (p_response_filter = 'waiting' AND s.last_message_direction = 'inbound' AND s.unread_count > 0) OR
      (p_response_filter = 'never' AND s.last_customer_message_at IS NULL) OR
      (p_response_filter = 'replied' AND s.last_message_direction = 'outbound')
    )
    -- Etapa filter
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR p_etapa_filter = 'all' OR
      l.etapa = p_etapa_filter
    );
  
  RETURN result;
END;
$$;