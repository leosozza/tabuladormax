-- ============================================
-- FIX: RPCs now use phone_number join instead of non-existent l.bitrix_id
-- Also: add stats RPC using materialized view for performance
-- ============================================

-- Drop existing functions to recreate with correct logic
DROP FUNCTION IF EXISTS get_admin_whatsapp_conversations(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS count_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_admin_whatsapp_stats();

-- ============================================
-- FUNCTION: get_admin_whatsapp_conversations (FIXED - uses phone join)
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT NULL,
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
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT 
      s.phone_number,
      s.bitrix_id,
      s.last_message_at,
      s.last_customer_message_at,
      s.total_messages,
      s.unread_count,
      s.last_message_preview,
      s.last_message_direction
    FROM mv_whatsapp_conversation_stats s
    WHERE s.last_message_at > NOW() - INTERVAL '90 days'
  ),
  with_lead AS (
    SELECT 
      cs.*,
      l.id AS lead_id,
      COALESCE(l.name, 'Desconhecido') AS lead_name,
      l.etapa AS lead_etapa,
      l.bitrix_telemarketing_id
    FROM conversation_stats cs
    LEFT JOIN leads l ON (
      l.phone_normalized = cs.phone_number 
      OR l.celular = cs.phone_number
    )
  ),
  with_operator AS (
    SELECT 
      wl.*,
      atm.bitrix_telemarketing_name AS last_operator_name,
      p.avatar_url AS last_operator_photo_url
    FROM with_lead wl
    LEFT JOIN agent_telemarketing_mapping atm ON atm.bitrix_telemarketing_id = wl.bitrix_telemarketing_id
    LEFT JOIN profiles p ON p.id = atm.tabuladormax_user_id
  ),
  with_response_status AS (
    SELECT 
      wo.*,
      CASE 
        WHEN wo.last_message_direction = 'outbound' THEN 'replied'
        WHEN wo.last_customer_message_at IS NOT NULL 
             AND wo.last_message_direction = 'inbound' THEN 'waiting'
        ELSE 'never'
      END AS response_status
    FROM with_operator wo
  )
  SELECT 
    wrs.phone_number,
    wrs.bitrix_id,
    wrs.lead_name,
    wrs.lead_id,
    wrs.last_message_at,
    wrs.last_message_preview,
    wrs.last_message_direction,
    wrs.last_customer_message_at,
    wrs.unread_count,
    wrs.total_messages,
    wrs.last_operator_name,
    wrs.last_operator_photo_url,
    wrs.lead_etapa,
    wrs.response_status
  FROM with_response_status wrs
  WHERE 
    -- Search filter
    (p_search IS NULL OR p_search = '' OR 
      wrs.phone_number ILIKE '%' || p_search || '%' OR 
      wrs.lead_name ILIKE '%' || p_search || '%' OR
      wrs.bitrix_id ILIKE '%' || p_search || '%')
    -- Window filter (24h since last customer message)
    AND (p_window_filter = 'all' 
      OR (p_window_filter = 'open' AND wrs.last_customer_message_at > NOW() - INTERVAL '24 hours')
      OR (p_window_filter = 'closed' AND (wrs.last_customer_message_at IS NULL OR wrs.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    -- Response filter
    AND (p_response_filter IS NULL OR p_response_filter = 'all' OR wrs.response_status = p_response_filter)
    -- Etapa filter
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR wrs.lead_etapa = p_etapa_filter)
  ORDER BY wrs.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================
-- FUNCTION: count_admin_whatsapp_conversations (FIXED - uses MV)
-- ============================================
CREATE OR REPLACE FUNCTION count_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT NULL,
  p_etapa_filter TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BIGINT;
BEGIN
  WITH conversation_stats AS (
    SELECT 
      s.phone_number,
      s.bitrix_id,
      s.last_message_at,
      s.last_customer_message_at,
      s.last_message_direction
    FROM mv_whatsapp_conversation_stats s
    WHERE s.last_message_at > NOW() - INTERVAL '90 days'
  ),
  with_lead AS (
    SELECT 
      cs.*,
      l.name AS lead_name,
      l.etapa AS lead_etapa
    FROM conversation_stats cs
    LEFT JOIN leads l ON (
      l.phone_normalized = cs.phone_number 
      OR l.celular = cs.phone_number
    )
  ),
  with_response_status AS (
    SELECT 
      wl.*,
      CASE 
        WHEN wl.last_message_direction = 'outbound' THEN 'replied'
        WHEN wl.last_customer_message_at IS NOT NULL 
             AND wl.last_message_direction = 'inbound' THEN 'waiting'
        ELSE 'never'
      END AS response_status
    FROM with_lead wl
  )
  SELECT COUNT(*) INTO result
  FROM with_response_status wrs
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      wrs.phone_number ILIKE '%' || p_search || '%' OR 
      wrs.lead_name ILIKE '%' || p_search || '%' OR
      wrs.bitrix_id ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' 
      OR (p_window_filter = 'open' AND wrs.last_customer_message_at > NOW() - INTERVAL '24 hours')
      OR (p_window_filter = 'closed' AND (wrs.last_customer_message_at IS NULL OR wrs.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter IS NULL OR p_response_filter = 'all' OR wrs.response_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR wrs.lead_etapa = p_etapa_filter);

  RETURN result;
END;
$$;

-- ============================================
-- FUNCTION: get_admin_whatsapp_stats (NEW - uses MV for fast stats)
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_whatsapp_stats()
RETURNS TABLE (
  total_conversations BIGINT,
  open_windows BIGINT,
  total_unread BIGINT,
  last_refresh TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_conversations,
    COUNT(*) FILTER (WHERE s.last_customer_message_at > NOW() - INTERVAL '24 hours')::BIGINT AS open_windows,
    COALESCE(SUM(s.unread_count), 0)::BIGINT AS total_unread,
    MAX(s.last_message_at) AS last_refresh
  FROM mv_whatsapp_conversation_stats s
  WHERE s.last_message_at > NOW() - INTERVAL '90 days';
END;
$$;

-- ============================================
-- CRON: Schedule automatic refresh of materialized view every 2 minutes
-- ============================================
SELECT cron.schedule(
  'refresh-whatsapp-stats',
  '*/2 * * * *',
  $$SELECT refresh_whatsapp_stats()$$
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_whatsapp_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION count_admin_whatsapp_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_whatsapp_stats TO authenticated;