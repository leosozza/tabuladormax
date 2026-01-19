-- Dropar AMBAS as versões existentes da função (com diferentes assinaturas)
DROP FUNCTION IF EXISTS get_admin_whatsapp_conversations(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);

-- Recriar versão unificada com a ordem de parâmetros e campos de retorno corretos
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
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      COUNT(*) as total_messages,
      MAX(wm.created_at) as last_message_at,
      MAX(CASE WHEN wm.direction = 'inbound' THEN wm.created_at END) as last_customer_message_at,
      COUNT(*) FILTER (WHERE wm.direction = 'inbound' AND wm.read_at IS NULL) as unread_count,
      (SELECT wm2.content FROM whatsapp_messages wm2 
       WHERE wm2.phone_number = wm.phone_number 
       ORDER BY wm2.created_at DESC LIMIT 1) as last_message_preview,
      (SELECT wm2.direction FROM whatsapp_messages wm2 
       WHERE wm2.phone_number = wm.phone_number 
       ORDER BY wm2.created_at DESC LIMIT 1) as last_message_direction,
      (SELECT wm2.operator_id FROM whatsapp_messages wm2 
       WHERE wm2.phone_number = wm.phone_number AND wm2.direction = 'outbound' AND wm2.operator_id IS NOT NULL
       ORDER BY wm2.created_at DESC LIMIT 1) as last_operator_id
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  response_status_cte AS (
    SELECT
      cs.phone_number,
      cs.total_messages,
      cs.last_message_at,
      cs.last_customer_message_at,
      cs.unread_count,
      cs.last_message_preview,
      cs.last_message_direction,
      cs.last_operator_id,
      CASE
        WHEN cs.last_message_direction = 'inbound' THEN 'waiting'
        WHEN cs.last_customer_message_at IS NULL THEN 'never'
        ELSE 'replied'
      END as response_status
    FROM conversation_stats cs
  )
  SELECT
    rs.phone_number::TEXT,
    l.bitrix_id::TEXT,
    COALESCE(l.name, 'Desconhecido')::TEXT as lead_name,
    l.id as lead_id,
    rs.last_message_at,
    rs.last_message_preview::TEXT,
    rs.last_message_direction::TEXT,
    rs.last_customer_message_at,
    rs.unread_count,
    rs.total_messages,
    p.full_name::TEXT as last_operator_name,
    p.photo_url::TEXT as last_operator_photo_url,
    l.etapa::TEXT as lead_etapa,
    rs.response_status::TEXT
  FROM response_status_cte rs
  LEFT JOIN leads l ON l.phone_normalized = rs.phone_number
                    OR l.celular = rs.phone_number
  LEFT JOIN profiles p ON p.id = rs.last_operator_id
  WHERE
    -- Filtro de busca
    (p_search IS NULL OR p_search = '' OR 
     rs.phone_number ILIKE '%' || p_search || '%' OR
     l.name ILIKE '%' || p_search || '%')
    -- Filtro de janela (24h)
    AND (p_window_filter = 'all' OR
         (p_window_filter = 'open' AND rs.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
         (p_window_filter = 'closed' AND (rs.last_customer_message_at IS NULL OR rs.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    -- Filtro de status de resposta
    AND (p_response_filter = 'all' OR rs.response_status = p_response_filter)
    -- Filtro de etapa
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter)
  ORDER BY rs.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;