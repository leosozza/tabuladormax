-- Fix get_admin_whatsapp_conversations to properly join with leads table
-- The materialized view doesn't have lead_name, lead_etapa, etc - needs JOIN

DROP FUNCTION IF EXISTS get_admin_whatsapp_conversations(text, integer, integer, text, text, text, text[], text, text);

CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_tag_filter text[] DEFAULT NULL,
  p_operator_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active'
)
RETURNS TABLE (
  phone_number text,
  bitrix_id text,
  lead_name text,
  lead_id bigint,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_direction text,
  last_customer_message_at timestamptz,
  unread_count bigint,
  total_messages bigint,
  last_operator_name text,
  last_operator_photo_url text,
  lead_etapa text,
  response_status text,
  deal_stage_id text,
  deal_status text,
  deal_category_id text,
  deal_count bigint,
  deal_title text,
  contract_number text,
  maxsystem_id text,
  is_closed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_etapa text;
BEGIN
  -- Normalize etapa filter
  IF p_etapa_filter IS NOT NULL THEN
    IF LOWER(p_etapa_filter) = 'lead convertido' OR LOWER(p_etapa_filter) = 'converted' THEN
      v_normalized_etapa := 'CONVERTED';
    ELSE
      v_normalized_etapa := p_etapa_filter;
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    s.phone_number::text,
    s.bitrix_id::text,
    l.name::text as lead_name,
    l.id as lead_id,
    s.last_message_at,
    s.last_message_preview::text,
    s.last_message_direction::text,
    s.last_customer_message_at,
    s.unread_count,
    s.total_messages,
    atm.bitrix_telemarketing_name::text as last_operator_name,
    NULL::text as last_operator_photo_url,
    l.etapa::text as lead_etapa,
    s.response_status::text,
    d.stage_id::text as deal_stage_id,
    CASE 
      WHEN d.stage_id LIKE '%:WON' THEN 'won'
      WHEN d.stage_id LIKE '%:LOSE' THEN 'lost'
      WHEN d.stage_id IS NOT NULL THEN 'open'
      ELSE NULL
    END::text as deal_status,
    d.category_id::text as deal_category_id,
    COALESCE(deal_stats.deal_count, 0) as deal_count,
    d.title::text as deal_title,
    l.numero_contrato::text as contract_number,
    l.id_maxsystem::text as maxsystem_id,
    COALESCE(s.is_closed, false) as is_closed
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON l.id = CASE 
    WHEN s.bitrix_id IS NOT NULL AND s.bitrix_id ~ '^[0-9]+$' 
    THEN s.bitrix_id::bigint 
    ELSE NULL 
  END
  LEFT JOIN agent_telemarketing_mapping atm ON atm.bitrix_telemarketing_id = l.bitrix_telemarketing_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint as deal_count
    FROM deals dd
    WHERE dd.bitrix_lead_id = l.id::integer
  ) deal_stats ON true
  LEFT JOIN LATERAL (
    SELECT dd.stage_id, dd.category_id, dd.title
    FROM deals dd
    WHERE dd.bitrix_lead_id = l.id::integer
    ORDER BY dd.created_at DESC
    LIMIT 1
  ) d ON true
  WHERE 1=1
    -- Search filter
    AND (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%' OR
      s.bitrix_id ILIKE '%' || p_search || '%' OR
      l.numero_contrato ILIKE '%' || p_search || '%' OR
      l.id_maxsystem ILIKE '%' || p_search || '%')
    -- Window filter
    AND (p_window_filter = 'all' OR 
      (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    -- Response filter
    AND (p_response_filter = 'all' OR s.response_status = p_response_filter)
    -- Etapa filter with normalization
    AND (v_normalized_etapa IS NULL OR 
      UPPER(l.etapa) = UPPER(v_normalized_etapa) OR
      (v_normalized_etapa = 'CONVERTED' AND UPPER(l.etapa) IN ('LEAD CONVERTIDO', 'CONVERTED')))
    -- Deal status filter
    AND (p_deal_status_filter = 'all' OR
      (p_deal_status_filter = 'won' AND d.stage_id LIKE '%:WON') OR
      (p_deal_status_filter = 'lost' AND d.stage_id LIKE '%:LOSE') OR
      (p_deal_status_filter = 'open' AND d.stage_id IS NOT NULL AND d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE') OR
      (p_deal_status_filter = 'no_deal' AND COALESCE(deal_stats.deal_count, 0) = 0))
    -- Operator filter
    AND (p_operator_filter IS NULL OR atm.bitrix_telemarketing_name ILIKE '%' || p_operator_filter || '%')
    -- Tag filter (via phone in label assignments)
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM conversation_label_assignments cla
      JOIN conversation_labels cl ON cl.id = cla.label_id
      JOIN chatwoot_contacts cc ON cc.conversation_id = cla.conversation_id
      WHERE cc.phone_number = s.phone_number
        AND cl.name = ANY(p_tag_filter)
    ))
    -- Closed filter
    AND (p_closed_filter = 'all' OR
      (p_closed_filter = 'active' AND COALESCE(s.is_closed, false) = false) OR
      (p_closed_filter = 'closed' AND s.is_closed = true))
  ORDER BY s.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Fix count function
DROP FUNCTION IF EXISTS count_admin_whatsapp_conversations(text, text, text, text, text[], text, text);

CREATE OR REPLACE FUNCTION count_admin_whatsapp_conversations(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_tag_filter text[] DEFAULT NULL,
  p_operator_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_etapa text;
  v_count bigint;
BEGIN
  IF p_etapa_filter IS NOT NULL THEN
    IF LOWER(p_etapa_filter) = 'lead convertido' OR LOWER(p_etapa_filter) = 'converted' THEN
      v_normalized_etapa := 'CONVERTED';
    ELSE
      v_normalized_etapa := p_etapa_filter;
    END IF;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON l.id = CASE 
    WHEN s.bitrix_id IS NOT NULL AND s.bitrix_id ~ '^[0-9]+$' 
    THEN s.bitrix_id::bigint 
    ELSE NULL 
  END
  LEFT JOIN agent_telemarketing_mapping atm ON atm.bitrix_telemarketing_id = l.bitrix_telemarketing_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint as deal_count
    FROM deals dd
    WHERE dd.bitrix_lead_id = l.id::integer
  ) deal_stats ON true
  LEFT JOIN LATERAL (
    SELECT dd.stage_id
    FROM deals dd
    WHERE dd.bitrix_lead_id = l.id::integer
    ORDER BY dd.created_at DESC
    LIMIT 1
  ) d ON true
  WHERE 1=1
    AND (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%' OR
      s.bitrix_id ILIKE '%' || p_search || '%' OR
      l.numero_contrato ILIKE '%' || p_search || '%' OR
      l.id_maxsystem ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' OR 
      (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' OR s.response_status = p_response_filter)
    AND (v_normalized_etapa IS NULL OR 
      UPPER(l.etapa) = UPPER(v_normalized_etapa) OR
      (v_normalized_etapa = 'CONVERTED' AND UPPER(l.etapa) IN ('LEAD CONVERTIDO', 'CONVERTED')))
    AND (p_deal_status_filter = 'all' OR
      (p_deal_status_filter = 'won' AND d.stage_id LIKE '%:WON') OR
      (p_deal_status_filter = 'lost' AND d.stage_id LIKE '%:LOSE') OR
      (p_deal_status_filter = 'open' AND d.stage_id IS NOT NULL AND d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE') OR
      (p_deal_status_filter = 'no_deal' AND COALESCE(deal_stats.deal_count, 0) = 0))
    AND (p_operator_filter IS NULL OR atm.bitrix_telemarketing_name ILIKE '%' || p_operator_filter || '%')
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM conversation_label_assignments cla
      JOIN conversation_labels cl ON cl.id = cla.label_id
      JOIN chatwoot_contacts cc ON cc.conversation_id = cla.conversation_id
      WHERE cc.phone_number = s.phone_number
        AND cl.name = ANY(p_tag_filter)
    ))
    AND (p_closed_filter = 'all' OR
      (p_closed_filter = 'active' AND COALESCE(s.is_closed, false) = false) OR
      (p_closed_filter = 'closed' AND s.is_closed = true));

  RETURN v_count;
END;
$$;

-- Fix filtered stats function
DROP FUNCTION IF EXISTS get_admin_whatsapp_filtered_stats(text, text, text, text, text[], text, text);

CREATE OR REPLACE FUNCTION get_admin_whatsapp_filtered_stats(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_tag_filter text[] DEFAULT NULL,
  p_operator_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active'
)
RETURNS TABLE (
  total_conversations bigint,
  open_windows bigint,
  total_unread bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_etapa text;
BEGIN
  IF p_etapa_filter IS NOT NULL THEN
    IF LOWER(p_etapa_filter) = 'lead convertido' OR LOWER(p_etapa_filter) = 'converted' THEN
      v_normalized_etapa := 'CONVERTED';
    ELSE
      v_normalized_etapa := p_etapa_filter;
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_conversations,
    COUNT(*) FILTER (WHERE s.last_customer_message_at > NOW() - INTERVAL '24 hours')::bigint AS open_windows,
    COALESCE(SUM(s.unread_count), 0)::bigint AS total_unread
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON l.id = CASE 
    WHEN s.bitrix_id IS NOT NULL AND s.bitrix_id ~ '^[0-9]+$' 
    THEN s.bitrix_id::bigint 
    ELSE NULL 
  END
  LEFT JOIN agent_telemarketing_mapping atm ON atm.bitrix_telemarketing_id = l.bitrix_telemarketing_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint as deal_count
    FROM deals dd
    WHERE dd.bitrix_lead_id = l.id::integer
  ) deal_stats ON true
  LEFT JOIN LATERAL (
    SELECT dd.stage_id
    FROM deals dd
    WHERE dd.bitrix_lead_id = l.id::integer
    ORDER BY dd.created_at DESC
    LIMIT 1
  ) d ON true
  WHERE 1=1
    AND (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%' OR
      s.bitrix_id ILIKE '%' || p_search || '%' OR
      l.numero_contrato ILIKE '%' || p_search || '%' OR
      l.id_maxsystem ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' OR 
      (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' OR s.response_status = p_response_filter)
    AND (v_normalized_etapa IS NULL OR 
      UPPER(l.etapa) = UPPER(v_normalized_etapa) OR
      (v_normalized_etapa = 'CONVERTED' AND UPPER(l.etapa) IN ('LEAD CONVERTIDO', 'CONVERTED')))
    AND (p_deal_status_filter = 'all' OR
      (p_deal_status_filter = 'won' AND d.stage_id LIKE '%:WON') OR
      (p_deal_status_filter = 'lost' AND d.stage_id LIKE '%:LOSE') OR
      (p_deal_status_filter = 'open' AND d.stage_id IS NOT NULL AND d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE') OR
      (p_deal_status_filter = 'no_deal' AND COALESCE(deal_stats.deal_count, 0) = 0))
    AND (p_operator_filter IS NULL OR atm.bitrix_telemarketing_name ILIKE '%' || p_operator_filter || '%')
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM conversation_label_assignments cla
      JOIN conversation_labels cl ON cl.id = cla.label_id
      JOIN chatwoot_contacts cc ON cc.conversation_id = cla.conversation_id
      WHERE cc.phone_number = s.phone_number
        AND cl.name = ANY(p_tag_filter)
    ))
    AND (p_closed_filter = 'all' OR
      (p_closed_filter = 'active' AND COALESCE(s.is_closed, false) = false) OR
      (p_closed_filter = 'closed' AND s.is_closed = true));
END;
$$;