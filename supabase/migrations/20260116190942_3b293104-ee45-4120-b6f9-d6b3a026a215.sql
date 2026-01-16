-- Drop existing functions first to allow changing return type
DROP FUNCTION IF EXISTS get_admin_whatsapp_conversations(INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS count_admin_whatsapp_conversations(TEXT, TEXT);

-- Recreate get_admin_whatsapp_conversations with operator info and fixed type casting
CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all'
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
  last_operator_photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  window_hours INTEGER := 24;
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      wm.bitrix_id,
      MAX(wm.created_at) as last_message_at,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) as last_customer_message_at,
      COUNT(*) FILTER (WHERE wm.read_at IS NULL AND wm.direction = 'inbound') as unread_count,
      COUNT(*) as total_messages
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number, wm.bitrix_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (COALESCE(wm.phone_number, wm.bitrix_id))
      COALESCE(wm.phone_number, wm.bitrix_id) as conv_key,
      wm.content as last_message_preview,
      wm.direction as last_message_direction
    FROM whatsapp_messages wm
    ORDER BY COALESCE(wm.phone_number, wm.bitrix_id), wm.created_at DESC
  ),
  last_operators AS (
    SELECT DISTINCT ON (COALESCE(wm.phone_number, wm.bitrix_id))
      COALESCE(wm.phone_number, wm.bitrix_id) as conv_key,
      wm.sender_name as operator_name,
      t.photo_url as operator_photo_url
    FROM whatsapp_messages wm
    LEFT JOIN telemarketing_operators t ON LOWER(t.name) = LOWER(wm.sender_name)
    WHERE wm.direction = 'outbound'
      AND wm.sender_name IS NOT NULL
      AND wm.sender_name != ''
      AND wm.sender_name NOT LIKE '%@%'
      AND LOWER(wm.sender_name) NOT LIKE '%automação%'
      AND LOWER(wm.sender_name) NOT LIKE '%automacao%'
      AND LOWER(wm.sender_name) NOT LIKE '%flow%'
      AND LOWER(wm.sender_name) NOT LIKE '%sistema%'
      AND LOWER(wm.sender_name) NOT LIKE '%bot%'
    ORDER BY COALESCE(wm.phone_number, wm.bitrix_id), wm.created_at DESC
  ),
  conversations AS (
    SELECT 
      cs.phone_number,
      cs.bitrix_id,
      COALESCE(l.title, cs.phone_number, cs.bitrix_id) as lead_name,
      l.id as lead_id,
      cs.last_message_at,
      lm.last_message_preview,
      lm.last_message_direction,
      cs.last_customer_message_at,
      cs.unread_count,
      cs.total_messages,
      lo.operator_name as last_operator_name,
      lo.operator_photo_url as last_operator_photo_url
    FROM conversation_stats cs
    LEFT JOIN leads l ON l.id = CASE 
      WHEN cs.bitrix_id ~ '^\d+$' THEN cs.bitrix_id::BIGINT 
      ELSE NULL 
    END
    LEFT JOIN last_messages lm ON lm.conv_key = COALESCE(cs.phone_number, cs.bitrix_id)
    LEFT JOIN last_operators lo ON lo.conv_key = COALESCE(cs.phone_number, cs.bitrix_id)
  )
  SELECT 
    c.phone_number,
    c.bitrix_id,
    c.lead_name,
    c.lead_id,
    c.last_message_at,
    c.last_message_preview,
    c.last_message_direction,
    c.last_customer_message_at,
    c.unread_count,
    c.total_messages,
    c.last_operator_name,
    c.last_operator_photo_url
  FROM conversations c
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
     c.lead_name ILIKE '%' || p_search || '%' OR 
     c.phone_number ILIKE '%' || p_search || '%' OR
     c.bitrix_id ILIKE '%' || p_search || '%')
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND c.last_customer_message_at > NOW() - (window_hours || ' hours')::INTERVAL) OR
      (p_window_filter = 'closed' AND (c.last_customer_message_at IS NULL OR c.last_customer_message_at <= NOW() - (window_hours || ' hours')::INTERVAL))
    )
  ORDER BY c.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Recreate count_admin_whatsapp_conversations with fixed type casting
CREATE OR REPLACE FUNCTION count_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  window_hours INTEGER := 24;
  result BIGINT;
BEGIN
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      wm.bitrix_id,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) as last_customer_message_at
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number, wm.bitrix_id
  ),
  conversations AS (
    SELECT 
      cs.phone_number,
      cs.bitrix_id,
      COALESCE(l.title, cs.phone_number, cs.bitrix_id) as lead_name,
      cs.last_customer_message_at
    FROM conversation_stats cs
    LEFT JOIN leads l ON l.id = CASE 
      WHEN cs.bitrix_id ~ '^\d+$' THEN cs.bitrix_id::BIGINT 
      ELSE NULL 
    END
  )
  SELECT COUNT(*)
  INTO result
  FROM conversations c
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
     c.lead_name ILIKE '%' || p_search || '%' OR 
     c.phone_number ILIKE '%' || p_search || '%' OR
     c.bitrix_id ILIKE '%' || p_search || '%')
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND c.last_customer_message_at > NOW() - (window_hours || ' hours')::INTERVAL) OR
      (p_window_filter = 'closed' AND (c.last_customer_message_at IS NULL OR c.last_customer_message_at <= NOW() - (window_hours || ' hours')::INTERVAL))
    );
  
  RETURN result;
END;
$$;