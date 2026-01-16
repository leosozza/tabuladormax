-- RPC para listar todas as conversas WhatsApp agrupadas (para admin)
CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all' -- 'all', 'open', 'closed'
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
  total_messages BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_window_hours INT := 24;
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      wm.bitrix_id::TEXT,
      MAX(wm.created_at) as last_msg_at,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) as last_inbound_at,
      COUNT(*) FILTER (WHERE wm.read_at IS NULL AND wm.direction = 'inbound') as unread_cnt,
      COUNT(*) as total_msgs
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number, wm.bitrix_id
  ),
  latest_messages AS (
    SELECT DISTINCT ON (COALESCE(wm.phone_number, wm.bitrix_id::TEXT))
      wm.phone_number,
      wm.bitrix_id::TEXT as bitrix_id,
      wm.content as last_preview,
      wm.direction as last_direction,
      wm.created_at
    FROM whatsapp_messages wm
    ORDER BY COALESCE(wm.phone_number, wm.bitrix_id::TEXT), wm.created_at DESC
  ),
  lead_info AS (
    SELECT DISTINCT ON (COALESCE(wm.phone_number, wm.bitrix_id::TEXT))
      COALESCE(wm.phone_number, wm.bitrix_id::TEXT) as conv_key,
      l.id as lead_id,
      l.nome as lead_name
    FROM whatsapp_messages wm
    LEFT JOIN leads l ON l.id = wm.bitrix_id
    WHERE wm.bitrix_id IS NOT NULL
    ORDER BY COALESCE(wm.phone_number, wm.bitrix_id::TEXT), wm.created_at DESC
  )
  SELECT 
    cs.phone_number,
    cs.bitrix_id,
    COALESCE(li.lead_name, 'Contato') as lead_name,
    li.lead_id,
    cs.last_msg_at as last_message_at,
    LEFT(lm.last_preview, 100) as last_message_preview,
    lm.last_direction as last_message_direction,
    cs.last_inbound_at as last_customer_message_at,
    cs.unread_cnt as unread_count,
    cs.total_msgs as total_messages
  FROM conversation_stats cs
  LEFT JOIN latest_messages lm ON COALESCE(cs.phone_number, cs.bitrix_id) = COALESCE(lm.phone_number, lm.bitrix_id)
  LEFT JOIN lead_info li ON COALESCE(cs.phone_number, cs.bitrix_id) = li.conv_key
  WHERE 
    -- Search filter
    (p_search IS NULL OR p_search = '' OR 
      cs.phone_number ILIKE '%' || p_search || '%' OR
      li.lead_name ILIKE '%' || p_search || '%')
    -- Window filter
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND cs.last_inbound_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (cs.last_inbound_at IS NULL OR cs.last_inbound_at <= NOW() - INTERVAL '24 hours'))
    )
  ORDER BY cs.last_msg_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Função para contar total de conversas (para paginação)
CREATE OR REPLACE FUNCTION count_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all'
)
RETURNS BIGINT
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(wm.phone_number, wm.bitrix_id::TEXT))
  INTO v_count
  FROM whatsapp_messages wm
  LEFT JOIN leads l ON l.id = wm.bitrix_id
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      wm.phone_number ILIKE '%' || p_search || '%' OR
      l.nome ILIKE '%' || p_search || '%')
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND EXISTS (
        SELECT 1 FROM whatsapp_messages wm2 
        WHERE COALESCE(wm2.phone_number, wm2.bitrix_id::TEXT) = COALESCE(wm.phone_number, wm.bitrix_id::TEXT)
        AND wm2.direction = 'inbound' 
        AND wm2.created_at > NOW() - INTERVAL '24 hours'
      )) OR
      (p_window_filter = 'closed' AND NOT EXISTS (
        SELECT 1 FROM whatsapp_messages wm2 
        WHERE COALESCE(wm2.phone_number, wm2.bitrix_id::TEXT) = COALESCE(wm.phone_number, wm.bitrix_id::TEXT)
        AND wm2.direction = 'inbound' 
        AND wm2.created_at > NOW() - INTERVAL '24 hours'
      ))
    );
  
  RETURN v_count;
END;
$$;