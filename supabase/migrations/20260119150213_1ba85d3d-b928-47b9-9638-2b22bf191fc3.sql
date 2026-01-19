-- Drop the broken function
DROP FUNCTION IF EXISTS get_admin_whatsapp_conversations(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT);

-- Recreate with correct column references
CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_messages AS (
    SELECT 
      wm.phone_number,
      wm.bitrix_id,
      MAX(wm.created_at) as last_message_at,
      -- Last message preview
      (SELECT wm2.message_content FROM whatsapp_messages wm2 
       WHERE wm2.phone_number = wm.phone_number 
       ORDER BY wm2.created_at DESC LIMIT 1) as last_message_preview,
      -- Last message direction
      (SELECT wm2.direction FROM whatsapp_messages wm2 
       WHERE wm2.phone_number = wm.phone_number 
       ORDER BY wm2.created_at DESC LIMIT 1) as last_message_direction,
      -- Last customer message timestamp
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) as last_customer_message_at,
      -- Unread count
      COUNT(CASE WHEN wm.direction = 'inbound' AND wm.read_at IS NULL THEN 1 END) as unread_count,
      -- Total messages
      COUNT(*) as total_messages,
      -- Last operator name (from outbound messages, excluding system senders)
      (SELECT wm2.sender_name FROM whatsapp_messages wm2 
       WHERE wm2.phone_number = wm.phone_number 
       AND wm2.direction = 'outbound' 
       AND wm2.sender_name IS NOT NULL
       AND wm2.sender_name NOT IN ('Flow Automático', 'Bitrix', 'Flow', 'Sistema', 'Bot')
       ORDER BY wm2.created_at DESC LIMIT 1) as last_operator_name
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number, wm.bitrix_id
  )
  SELECT 
    rm.phone_number::TEXT,
    rm.bitrix_id::TEXT,
    COALESCE(l.name, rm.phone_number)::TEXT as lead_name,
    l.id as lead_id,
    rm.last_message_at,
    LEFT(rm.last_message_preview, 100)::TEXT as last_message_preview,
    rm.last_message_direction::TEXT,
    rm.last_customer_message_at,
    rm.unread_count,
    rm.total_messages,
    rm.last_operator_name::TEXT,
    op.photo_url::TEXT as last_operator_photo_url,
    l.etapa::TEXT as lead_etapa,
    -- Response status calculation
    CASE 
      WHEN rm.last_message_direction = 'outbound' THEN 'replied'
      WHEN rm.last_customer_message_at IS NOT NULL AND rm.last_message_direction = 'inbound' THEN 'waiting'
      ELSE 'never'
    END::TEXT as response_status
  FROM ranked_messages rm
  LEFT JOIN leads l ON l.bitrix_id = rm.bitrix_id::INTEGER
  LEFT JOIN telemarketing_operators op ON (
    op.name = rm.last_operator_name 
    OR op.email = rm.last_operator_name
  )
  WHERE 
    -- Search filter
    (p_search IS NULL OR p_search = '' OR 
     rm.phone_number ILIKE '%' || p_search || '%' OR
     l.name ILIKE '%' || p_search || '%' OR
     rm.bitrix_id ILIKE '%' || p_search || '%')
    -- Window filter (24h window from last customer message)
    AND (p_window_filter = 'all' OR p_window_filter IS NULL OR
         (p_window_filter = 'open' AND rm.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
         (p_window_filter = 'closed' AND (rm.last_customer_message_at IS NULL OR rm.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    -- Response filter
    AND (p_response_filter = 'all' OR p_response_filter IS NULL OR
         (p_response_filter = 'waiting' AND rm.last_message_direction = 'inbound') OR
         (p_response_filter = 'replied' AND rm.last_message_direction = 'outbound') OR
         (p_response_filter = 'never' AND rm.last_customer_message_at IS NULL))
    -- Etapa filter
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter)
  ORDER BY rm.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;