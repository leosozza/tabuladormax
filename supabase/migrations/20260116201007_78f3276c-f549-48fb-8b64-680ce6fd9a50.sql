-- Update get_admin_whatsapp_conversations to handle both UC codes and readable names
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  phone_number TEXT,
  lead_id BIGINT,
  lead_name TEXT,
  lead_etapa TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT,
  unread_count BIGINT,
  last_customer_message_at TIMESTAMPTZ,
  operator_id TEXT,
  operator_name TEXT,
  response_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      MAX(wm.lead_id) as lead_id,
      MAX(wm.created_at) as last_message_at,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) as last_customer_message_at,
      MAX(CASE WHEN wm.direction = 'outbound' THEN wm.created_at END) as last_outbound_at,
      COUNT(*) FILTER (WHERE wm.direction = 'inbound' AND wm.read_at IS NULL) as unread_count,
      -- Calculate response status
      CASE
        WHEN MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) IS NULL THEN 'never'
        WHEN MAX(CASE WHEN wm.direction = 'outbound' THEN wm.created_at END) >
             MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) THEN 'waiting'
        ELSE 'replied'
      END as response_status
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  enriched AS (
    SELECT 
      c.phone_number,
      c.lead_id,
      l.nome as lead_name,
      l.etapa as lead_etapa,
      c.last_message_at,
      c.last_customer_message_at,
      c.unread_count,
      c.response_status,
      (
        SELECT wm2.content 
        FROM whatsapp_messages wm2 
        WHERE wm2.phone_number = c.phone_number 
        ORDER BY wm2.created_at DESC 
        LIMIT 1
      ) as last_message_preview,
      (
        SELECT wm2.direction 
        FROM whatsapp_messages wm2 
        WHERE wm2.phone_number = c.phone_number 
        ORDER BY wm2.created_at DESC 
        LIMIT 1
      ) as last_message_direction,
      (
        SELECT wm2.sent_by 
        FROM whatsapp_messages wm2 
        WHERE wm2.phone_number = c.phone_number AND wm2.direction = 'outbound'
        ORDER BY wm2.created_at DESC 
        LIMIT 1
      ) as last_operator_id
    FROM conversation_stats c
    LEFT JOIN leads l ON l.id = c.lead_id
  )
  SELECT 
    e.phone_number,
    e.lead_id,
    e.lead_name,
    e.lead_etapa,
    e.last_message_at,
    e.last_message_preview,
    e.last_message_direction,
    e.unread_count,
    e.last_customer_message_at,
    e.last_operator_id as operator_id,
    p.full_name as operator_name,
    e.response_status
  FROM enriched e
  LEFT JOIN profiles p ON p.id::text = e.last_operator_id
  WHERE 
    -- Search filter
    (
      p_search IS NULL OR p_search = '' OR
      e.phone_number ILIKE '%' || p_search || '%' OR
      e.lead_name ILIKE '%' || p_search || '%'
    )
    -- Window filter
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND e.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (e.last_customer_message_at IS NULL OR e.last_customer_message_at <= NOW() - INTERVAL '24 hours'))
    )
    -- Response filter
    AND (
      p_response_filter = 'all' OR
      e.response_status = p_response_filter
    )
    -- Etapa filter - check both UC code AND readable name equivalents
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR
      e.lead_etapa = p_etapa_filter OR
      (p_etapa_filter = 'UC_QWPO2W' AND e.lead_etapa = 'Agendados') OR
      (p_etapa_filter = 'UC_DDVFX3' AND e.lead_etapa = 'Lead a Qualificar') OR
      (p_etapa_filter = 'UC_8WYI7Q' AND e.lead_etapa = 'StandyBy') OR
      (p_etapa_filter = 'UC_SARR07' AND e.lead_etapa = 'Em agendamento') OR
      (p_etapa_filter = 'UC_AU7EMM' AND e.lead_etapa = 'Triagem') OR
      (p_etapa_filter = 'UC_MWJM5G' AND e.lead_etapa = 'Retornar Ligação') OR
      (p_etapa_filter = 'UC_DMLQB7' AND e.lead_etapa = 'Reagendar') OR
      (p_etapa_filter = 'Lead convertido' AND e.lead_etapa = 'CONVERTED')
    )
  ORDER BY e.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update count_admin_whatsapp_conversations to handle both UC codes and readable names
CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count BIGINT;
BEGIN
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      MAX(wm.lead_id) as lead_id,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) as last_customer_message_at,
      -- Calculate response status
      CASE
        WHEN MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) IS NULL THEN 'never'
        WHEN MAX(CASE WHEN wm.direction = 'outbound' THEN wm.created_at END) >
             MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) THEN 'waiting'
        ELSE 'replied'
      END as response_status
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  enriched AS (
    SELECT 
      c.phone_number,
      l.nome as lead_name,
      l.etapa as lead_etapa,
      c.last_customer_message_at,
      c.response_status
    FROM conversation_stats c
    LEFT JOIN leads l ON l.id = c.lead_id
  )
  SELECT COUNT(*)
  INTO total_count
  FROM enriched e
  WHERE 
    -- Search filter
    (
      p_search IS NULL OR p_search = '' OR
      e.phone_number ILIKE '%' || p_search || '%' OR
      e.lead_name ILIKE '%' || p_search || '%'
    )
    -- Window filter
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND e.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (e.last_customer_message_at IS NULL OR e.last_customer_message_at <= NOW() - INTERVAL '24 hours'))
    )
    -- Response filter
    AND (
      p_response_filter = 'all' OR
      e.response_status = p_response_filter
    )
    -- Etapa filter - check both UC code AND readable name equivalents
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR
      e.lead_etapa = p_etapa_filter OR
      (p_etapa_filter = 'UC_QWPO2W' AND e.lead_etapa = 'Agendados') OR
      (p_etapa_filter = 'UC_DDVFX3' AND e.lead_etapa = 'Lead a Qualificar') OR
      (p_etapa_filter = 'UC_8WYI7Q' AND e.lead_etapa = 'StandyBy') OR
      (p_etapa_filter = 'UC_SARR07' AND e.lead_etapa = 'Em agendamento') OR
      (p_etapa_filter = 'UC_AU7EMM' AND e.lead_etapa = 'Triagem') OR
      (p_etapa_filter = 'UC_MWJM5G' AND e.lead_etapa = 'Retornar Ligação') OR
      (p_etapa_filter = 'UC_DMLQB7' AND e.lead_etapa = 'Reagendar') OR
      (p_etapa_filter = 'Lead convertido' AND e.lead_etapa = 'CONVERTED')
    );

  RETURN total_count;
END;
$$;