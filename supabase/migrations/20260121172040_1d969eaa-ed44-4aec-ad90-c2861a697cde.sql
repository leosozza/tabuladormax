-- 1. Recriar Materialized View com response_status
DROP MATERIALIZED VIEW IF EXISTS mv_whatsapp_conversation_stats;

CREATE MATERIALIZED VIEW mv_whatsapp_conversation_stats AS
SELECT 
  phone_number,
  bitrix_id,
  MAX(created_at) AS last_message_at,
  MAX(created_at) FILTER (WHERE direction = 'inbound') AS last_customer_message_at,
  COUNT(*) AS total_messages,
  COUNT(*) FILTER (WHERE direction = 'inbound' AND read_at IS NULL) AS unread_count,
  (array_agg(content ORDER BY created_at DESC))[1] AS last_message_preview,
  (array_agg(direction ORDER BY created_at DESC))[1] AS last_message_direction,
  CASE 
    WHEN MAX(created_at) FILTER (WHERE direction = 'outbound') IS NULL THEN 'never'
    WHEN MAX(created_at) FILTER (WHERE direction = 'outbound') > 
         COALESCE(MAX(created_at) FILTER (WHERE direction = 'inbound'), '1900-01-01'::timestamptz)
    THEN 'replied'
    ELSE 'waiting'
  END AS response_status
FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY phone_number, bitrix_id;

CREATE INDEX idx_mv_stats_phone ON mv_whatsapp_conversation_stats(phone_number);
CREATE INDEX idx_mv_stats_bitrix ON mv_whatsapp_conversation_stats(bitrix_id);
CREATE INDEX idx_mv_stats_last_msg ON mv_whatsapp_conversation_stats(last_message_at DESC);
CREATE UNIQUE INDEX idx_mv_stats_unique ON mv_whatsapp_conversation_stats(phone_number, bitrix_id);

-- 2. Corrigir RPC get_admin_whatsapp_conversations (l.name em vez de l.nome)
CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0,
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.phone_number,
    s.bitrix_id,
    COALESCE(l.name, s.phone_number) AS lead_name,
    l.id AS lead_id,
    s.last_message_at,
    s.last_message_preview,
    s.last_message_direction,
    s.last_customer_message_at,
    s.unread_count,
    s.total_messages,
    atm.bitrix_telemarketing_name AS last_operator_name,
    NULL::TEXT AS last_operator_photo_url,
    l.etapa AS lead_etapa,
    s.response_status
  FROM mv_whatsapp_conversation_stats s
  INNER JOIN leads l ON (
    s.bitrix_id IS NOT NULL 
    AND s.bitrix_id ~ '^[0-9]+$' 
    AND s.bitrix_id::bigint = l.id
    AND l.etapa IN ('CONVERTED', 'Lead convertido', 'UC_ZZRXH3', 'UC_4XD4CV', 'UC_KQVHQM')
  )
  LEFT JOIN agent_telemarketing_mapping atm ON l.bitrix_telemarketing_id = atm.bitrix_telemarketing_id
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      l.name ILIKE '%' || p_search || '%' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR
      s.bitrix_id = p_search)
    AND (p_window_filter = 'all' OR 
      (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' OR s.response_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter)
  ORDER BY s.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Corrigir RPC count_admin_whatsapp_conversations
CREATE OR REPLACE FUNCTION count_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  result BIGINT;
BEGIN
  SELECT COUNT(*) INTO result
  FROM mv_whatsapp_conversation_stats s
  INNER JOIN leads l ON (
    s.bitrix_id IS NOT NULL 
    AND s.bitrix_id ~ '^[0-9]+$' 
    AND s.bitrix_id::bigint = l.id
    AND l.etapa IN ('CONVERTED', 'Lead convertido', 'UC_ZZRXH3', 'UC_4XD4CV', 'UC_KQVHQM')
  )
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      l.name ILIKE '%' || p_search || '%' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR
      s.bitrix_id = p_search)
    AND (p_window_filter = 'all' OR 
      (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' OR s.response_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atualizar get_admin_whatsapp_stats para usar a nova MV
CREATE OR REPLACE FUNCTION get_admin_whatsapp_stats()
RETURNS TABLE (
  total_conversations BIGINT,
  open_windows BIGINT,
  total_unread BIGINT,
  last_refresh TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_conversations,
    COUNT(*) FILTER (WHERE s.last_customer_message_at > NOW() - INTERVAL '24 hours')::BIGINT AS open_windows,
    COALESCE(SUM(s.unread_count), 0)::BIGINT AS total_unread,
    NOW() AS last_refresh
  FROM mv_whatsapp_conversation_stats s
  INNER JOIN leads l ON (
    s.bitrix_id IS NOT NULL 
    AND s.bitrix_id ~ '^[0-9]+$' 
    AND s.bitrix_id::bigint = l.id
    AND l.etapa IN ('CONVERTED', 'Lead convertido', 'UC_ZZRXH3', 'UC_4XD4CV', 'UC_KQVHQM')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;