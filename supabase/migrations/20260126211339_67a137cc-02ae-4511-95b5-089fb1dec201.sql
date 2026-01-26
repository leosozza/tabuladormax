-- RPC para calcular stats filtradas das conversas de WhatsApp
CREATE OR REPLACE FUNCTION get_admin_whatsapp_filtered_stats(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL,
  p_deal_status_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  total_conversations BIGINT,
  open_windows BIGINT,
  total_unread BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_conversations,
    COUNT(*) FILTER (WHERE 
      last_customer_message_at IS NOT NULL AND 
      last_customer_message_at > NOW() - INTERVAL '24 hours'
    )::BIGINT as open_windows,
    COALESCE(SUM(unread_count), 0)::BIGINT as total_unread
  FROM mv_whatsapp_conversation_stats mv
  LEFT JOIN leads l ON mv.bitrix_id::BIGINT = l.id
  LEFT JOIN deals d ON d.bitrix_lead_id = l.id 
    AND d.id = (
      SELECT d2.id FROM deals d2 
      WHERE d2.bitrix_lead_id = l.id 
      ORDER BY d2.created_at DESC 
      LIMIT 1
    )
  WHERE mv.last_message_at > NOW() - INTERVAL '90 days'
    -- Search filter
    AND (
      p_search IS NULL OR p_search = '' OR
      mv.phone_number ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%'
    )
    -- Window filter
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND mv.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (mv.last_customer_message_at IS NULL OR mv.last_customer_message_at <= NOW() - INTERVAL '24 hours'))
    )
    -- Response filter
    AND (
      p_response_filter = 'all' OR
      mv.response_status = p_response_filter
    )
    -- Etapa filter
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR
      l.etapa = p_etapa_filter OR
      (p_etapa_filter IN ('Lead convertido', 'CONVERTED') AND l.etapa IN ('Lead convertido', 'CONVERTED'))
    )
    -- Deal status filter
    AND (
      p_deal_status_filter = 'all' OR
      (p_deal_status_filter = 'no_deal' AND d.id IS NULL) OR
      (p_deal_status_filter = 'won' AND d.deal_status = 'won') OR
      (p_deal_status_filter = 'lost' AND d.deal_status = 'lost') OR
      (p_deal_status_filter = 'open' AND d.deal_status = 'open')
    );
END;
$$;