-- Fix get_admin_whatsapp_filtered_stats RPC to use stage_id instead of non-existent deal_status column
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
      mv.last_customer_message_at IS NOT NULL AND 
      mv.last_customer_message_at > NOW() - INTERVAL '24 hours'
    )::BIGINT as open_windows,
    COALESCE(SUM(mv.unread_count), 0)::BIGINT as total_unread
  FROM mv_whatsapp_conversation_stats mv
  LEFT JOIN leads l ON l.id = CASE 
    WHEN mv.bitrix_id IS NOT NULL AND mv.bitrix_id ~ '^[0-9]+$' 
    THEN mv.bitrix_id::bigint 
    ELSE NULL 
  END
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::bigint AS deal_count,
      MAX(CASE WHEN d.stage_id LIKE '%:WON' THEN 1 ELSE 0 END) AS has_won,
      MAX(CASE WHEN d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE' THEN 1 ELSE 0 END) AS has_open
    FROM deals d
    WHERE d.bitrix_lead_id = l.id::integer
  ) deal_summary ON true
  WHERE mv.last_message_at > NOW() - INTERVAL '90 days'
    AND (
      p_search IS NULL OR p_search = '' OR
      mv.phone_number ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%'
    )
    AND (
      p_window_filter = 'all' OR
      (p_window_filter = 'open' AND mv.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (mv.last_customer_message_at IS NULL OR mv.last_customer_message_at <= NOW() - INTERVAL '24 hours'))
    )
    AND (
      p_response_filter = 'all' OR
      mv.response_status = p_response_filter
    )
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR
      (p_etapa_filter = 'Lead convertido' AND l.etapa IN ('Lead convertido', 'CONVERTED')) OR
      l.etapa = p_etapa_filter
    )
    AND (
      p_deal_status_filter = 'all' OR
      (p_deal_status_filter = 'won' AND deal_summary.has_won = 1) OR
      (p_deal_status_filter = 'lost' AND deal_summary.deal_count > 0 AND deal_summary.has_won = 0 AND deal_summary.has_open = 0) OR
      (p_deal_status_filter = 'open' AND deal_summary.has_open = 1 AND deal_summary.has_won = 0) OR
      (p_deal_status_filter = 'no_deal' AND (deal_summary.deal_count IS NULL OR deal_summary.deal_count = 0))
    );
END;
$$;