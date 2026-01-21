-- Update the RPC function to include deal information
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all'
)
RETURNS TABLE(
  phone_number text,
  bitrix_id text,
  lead_name text,
  lead_id bigint,
  last_message_at timestamp with time zone,
  last_message_preview text,
  last_message_direction text,
  last_customer_message_at timestamp with time zone,
  unread_count bigint,
  total_messages bigint,
  last_operator_name text,
  last_operator_photo_url text,
  lead_etapa text,
  response_status text,
  deal_stage_id text,
  deal_status text,
  deal_category_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_data AS (
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
      bse.photo_url AS last_operator_photo_url,
      l.etapa AS lead_etapa,
      s.response_status,
      d.stage_id AS deal_stage_id,
      CASE 
        WHEN d.stage_id LIKE '%:WON' THEN 'won'
        WHEN d.stage_id LIKE '%:LOSE' THEN 'lost'
        WHEN d.id IS NOT NULL THEN 'open'
        ELSE NULL
      END AS deal_status,
      d.category_id AS deal_category_id
    FROM mv_whatsapp_conversation_stats s
    LEFT JOIN leads l ON (
      s.bitrix_id IS NOT NULL 
      AND s.bitrix_id ~ '^[0-9]+$' 
      AND s.bitrix_id::bigint = l.id
    )
    LEFT JOIN deals d ON d.bitrix_lead_id = l.id::integer
    LEFT JOIN agent_telemarketing_mapping atm ON l.bitrix_telemarketing_id = atm.bitrix_telemarketing_id
    LEFT JOIN bitrix_spa_entities bse ON atm.bitrix_telemarketing_id = bse.bitrix_item_id AND bse.entity_type_id = 1062
    WHERE 
      -- Search filter
      (p_search IS NULL OR p_search = '' OR 
       s.phone_number ILIKE '%' || p_search || '%' OR 
       s.bitrix_id ILIKE '%' || p_search || '%' OR
       COALESCE(l.name, '') ILIKE '%' || p_search || '%')
      -- Window filter (calculated at query time)
      AND (p_window_filter = 'all' 
        OR (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours')
        OR (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
      -- Response filter
      AND (p_response_filter = 'all' OR s.response_status = p_response_filter)
      -- Etapa filter
      AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter)
      -- Deal status filter
      AND (p_deal_status_filter = 'all' 
        OR (p_deal_status_filter = 'won' AND d.stage_id LIKE '%:WON')
        OR (p_deal_status_filter = 'lost' AND d.stage_id LIKE '%:LOSE')
        OR (p_deal_status_filter = 'open' AND d.id IS NOT NULL AND d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE')
        OR (p_deal_status_filter = 'no_deal' AND d.id IS NULL))
  )
  SELECT * FROM conversation_data
  ORDER BY conversation_data.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update the count function to include deal status filter
CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result bigint;
BEGIN
  SELECT COUNT(*)
  INTO result
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON (
    s.bitrix_id IS NOT NULL 
    AND s.bitrix_id ~ '^[0-9]+$' 
    AND s.bitrix_id::bigint = l.id
  )
  LEFT JOIN deals d ON d.bitrix_lead_id = l.id::integer
  WHERE 
    -- Search filter
    (p_search IS NULL OR p_search = '' OR 
     s.phone_number ILIKE '%' || p_search || '%' OR 
     s.bitrix_id ILIKE '%' || p_search || '%' OR
     COALESCE(l.name, '') ILIKE '%' || p_search || '%')
    -- Window filter
    AND (p_window_filter = 'all' 
      OR (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours')
      OR (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    -- Response filter
    AND (p_response_filter = 'all' OR s.response_status = p_response_filter)
    -- Etapa filter
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter)
    -- Deal status filter
    AND (p_deal_status_filter = 'all' 
      OR (p_deal_status_filter = 'won' AND d.stage_id LIKE '%:WON')
      OR (p_deal_status_filter = 'lost' AND d.stage_id LIKE '%:LOSE')
      OR (p_deal_status_filter = 'open' AND d.id IS NOT NULL AND d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE')
      OR (p_deal_status_filter = 'no_deal' AND d.id IS NULL));
  
  RETURN result;
END;
$$;