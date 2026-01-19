-- Drop all existing versions of the functions first
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT);

-- Recreate get_admin_whatsapp_conversations with correct JOIN (bitrix_id -> leads.id)
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  phone_number TEXT,
  bitrix_id TEXT,
  lead_id BIGINT,
  lead_name TEXT,
  lead_etapa TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT,
  last_customer_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  last_operator_name TEXT,
  last_operator_photo_url TEXT,
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
      COALESCE(wm.phone_number, '') AS conv_phone,
      wm.bitrix_id AS conv_bitrix_id,
      MAX(wm.message_timestamp) AS last_msg_at,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.message_timestamp END) AS last_cust_msg_at,
      COUNT(*) FILTER (WHERE wm.read_at IS NULL AND wm.direction = 'inbound') AS unread_cnt
    FROM whatsapp_messages wm
    WHERE wm.message_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY COALESCE(wm.phone_number, ''), wm.bitrix_id
  ),
  with_last_message AS (
    SELECT 
      cs.*,
      lm.content AS last_msg_preview,
      lm.direction AS last_msg_direction
    FROM conversation_stats cs
    LEFT JOIN LATERAL (
      SELECT wm2.content, wm2.direction
      FROM whatsapp_messages wm2
      WHERE (wm2.phone_number = cs.conv_phone OR (wm2.phone_number IS NULL AND cs.conv_phone = ''))
        AND (wm2.bitrix_id = cs.conv_bitrix_id OR (wm2.bitrix_id IS NULL AND cs.conv_bitrix_id IS NULL))
      ORDER BY wm2.message_timestamp DESC
      LIMIT 1
    ) lm ON true
  ),
  with_lead_info AS (
    SELECT 
      s.*,
      l.id AS lead_id_val,
      l.name AS lead_name_val,
      l.etapa AS lead_etapa_val,
      l.bitrix_telemarketing_id
    FROM with_last_message s
    LEFT JOIN leads l ON (
      s.conv_bitrix_id IS NOT NULL 
      AND s.conv_bitrix_id ~ '^\d+$' 
      AND s.conv_bitrix_id::BIGINT = l.id
    )
  ),
  with_operator AS (
    SELECT 
      wli.*,
      atm.bitrix_telemarketing_name AS operator_name_val
    FROM with_lead_info wli
    LEFT JOIN agent_telemarketing_mapping atm 
      ON wli.bitrix_telemarketing_id = atm.bitrix_telemarketing_id
  ),
  with_response_status AS (
    SELECT 
      wo.*,
      CASE 
        WHEN wo.last_msg_direction = 'outbound' THEN 'replied'
        WHEN wo.last_cust_msg_at IS NOT NULL 
             AND NOT EXISTS (
               SELECT 1 FROM whatsapp_messages wm3
               WHERE (wm3.phone_number = wo.conv_phone OR (wm3.phone_number IS NULL AND wo.conv_phone = ''))
                 AND (wm3.bitrix_id = wo.conv_bitrix_id OR (wm3.bitrix_id IS NULL AND wo.conv_bitrix_id IS NULL))
                 AND wm3.direction = 'outbound'
             ) THEN 'never'
        ELSE 'waiting'
      END AS resp_status
    FROM with_operator wo
  )
  SELECT 
    wrs.conv_phone AS phone_number,
    wrs.conv_bitrix_id AS bitrix_id,
    wrs.lead_id_val AS lead_id,
    wrs.lead_name_val AS lead_name,
    wrs.lead_etapa_val AS lead_etapa,
    wrs.last_msg_at AS last_message_at,
    LEFT(wrs.last_msg_preview, 100) AS last_message_preview,
    wrs.last_msg_direction AS last_message_direction,
    wrs.last_cust_msg_at AS last_customer_message_at,
    wrs.unread_cnt AS unread_count,
    wrs.operator_name_val AS last_operator_name,
    NULL::TEXT AS last_operator_photo_url,
    wrs.resp_status AS response_status
  FROM with_response_status wrs
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
     wrs.conv_phone ILIKE '%' || p_search || '%' OR
     wrs.lead_name_val ILIKE '%' || p_search || '%' OR
     wrs.conv_bitrix_id ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' OR 
         (p_window_filter = 'open' AND wrs.last_cust_msg_at > NOW() - INTERVAL '24 hours') OR
         (p_window_filter = 'closed' AND (wrs.last_cust_msg_at IS NULL OR wrs.last_cust_msg_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' OR wrs.resp_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR wrs.lead_etapa_val = p_etapa_filter)
  ORDER BY wrs.last_msg_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Recreate count_admin_whatsapp_conversations with correct JOIN
CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
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
  v_count BIGINT;
BEGIN
  WITH conversation_stats AS (
    SELECT 
      COALESCE(wm.phone_number, '') AS conv_phone,
      wm.bitrix_id AS conv_bitrix_id,
      MAX(wm.message_timestamp) AS last_msg_at,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.message_timestamp END) AS last_cust_msg_at
    FROM whatsapp_messages wm
    WHERE wm.message_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY COALESCE(wm.phone_number, ''), wm.bitrix_id
  ),
  with_last_message AS (
    SELECT 
      cs.*,
      lm.direction AS last_msg_direction
    FROM conversation_stats cs
    LEFT JOIN LATERAL (
      SELECT wm2.direction
      FROM whatsapp_messages wm2
      WHERE (wm2.phone_number = cs.conv_phone OR (wm2.phone_number IS NULL AND cs.conv_phone = ''))
        AND (wm2.bitrix_id = cs.conv_bitrix_id OR (wm2.bitrix_id IS NULL AND cs.conv_bitrix_id IS NULL))
      ORDER BY wm2.message_timestamp DESC
      LIMIT 1
    ) lm ON true
  ),
  with_lead_info AS (
    SELECT 
      s.*,
      l.name AS lead_name_val,
      l.etapa AS lead_etapa_val
    FROM with_last_message s
    LEFT JOIN leads l ON (
      s.conv_bitrix_id IS NOT NULL 
      AND s.conv_bitrix_id ~ '^\d+$' 
      AND s.conv_bitrix_id::BIGINT = l.id
    )
  ),
  with_response_status AS (
    SELECT 
      wli.*,
      CASE 
        WHEN wli.last_msg_direction = 'outbound' THEN 'replied'
        WHEN wli.last_cust_msg_at IS NOT NULL 
             AND NOT EXISTS (
               SELECT 1 FROM whatsapp_messages wm3
               WHERE (wm3.phone_number = wli.conv_phone OR (wm3.phone_number IS NULL AND wli.conv_phone = ''))
                 AND (wm3.bitrix_id = wli.conv_bitrix_id OR (wm3.bitrix_id IS NULL AND wli.conv_bitrix_id IS NULL))
                 AND wm3.direction = 'outbound'
             ) THEN 'never'
        ELSE 'waiting'
      END AS resp_status
    FROM with_lead_info wli
  )
  SELECT COUNT(*) INTO v_count
  FROM with_response_status wrs
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
     wrs.conv_phone ILIKE '%' || p_search || '%' OR
     wrs.lead_name_val ILIKE '%' || p_search || '%' OR
     wrs.conv_bitrix_id ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' OR 
         (p_window_filter = 'open' AND wrs.last_cust_msg_at > NOW() - INTERVAL '24 hours') OR
         (p_window_filter = 'closed' AND (wrs.last_cust_msg_at IS NULL OR wrs.last_cust_msg_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' OR wrs.resp_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR wrs.lead_etapa_val = p_etapa_filter);
  
  RETURN v_count;
END;
$$;

-- Create index on bitrix_id for faster JOINs
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_bitrix_id ON whatsapp_messages(bitrix_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT) TO authenticated;