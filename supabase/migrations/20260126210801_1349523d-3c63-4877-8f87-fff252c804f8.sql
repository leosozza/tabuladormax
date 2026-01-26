-- RPC para Dashboard da Central de Atendimento WhatsApp
CREATE OR REPLACE FUNCTION get_whatsapp_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'kpis', (
      SELECT json_build_object(
        'total', COUNT(*),
        'open_windows', COUNT(*) FILTER (WHERE last_customer_message_at > NOW() - INTERVAL '24 hours'),
        'waiting', COUNT(*) FILTER (WHERE response_status = 'waiting'),
        'never', COUNT(*) FILTER (WHERE response_status = 'never'),
        'replied', COUNT(*) FILTER (WHERE response_status = 'replied'),
        'unread', COALESCE(SUM(unread_count), 0)::bigint
      )
      FROM mv_whatsapp_conversation_stats
      WHERE last_message_at > NOW() - INTERVAL '90 days'
    ),
    'daily_volume', (
      SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
      FROM (
        SELECT 
          DATE(created_at AT TIME ZONE 'America/Sao_Paulo') as date,
          COUNT(*) FILTER (WHERE direction = 'inbound') as received,
          COUNT(*) FILTER (WHERE direction = 'outbound') as sent
        FROM whatsapp_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY 1
      ) d
    ),
    'hourly_distribution', (
      SELECT COALESCE(json_agg(row_to_json(h)), '[]'::json)
      FROM (
        SELECT 
          EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int as hour,
          COUNT(*) as count
        FROM whatsapp_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND direction = 'inbound'
        GROUP BY 1
        ORDER BY 1
      ) h
    ),
    'top_operators', (
      SELECT COALESCE(json_agg(row_to_json(o)), '[]'::json)
      FROM (
        SELECT sender_name as name, COUNT(*) as messages
        FROM whatsapp_messages
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND direction = 'outbound'
          AND sender_name IS NOT NULL
          AND sender_name NOT LIKE '%Bitrix%'
          AND sender_name NOT LIKE '%Flow%'
          AND sender_name NOT LIKE '%Sistema%'
          AND sender_name NOT LIKE '%Automação%'
          AND sender_name NOT LIKE '%Automation%'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
      ) o
    ),
    'closed_count', (
      SELECT COUNT(*) FROM whatsapp_conversation_closures WHERE reopened_at IS NULL
    ),
    'status_distribution', (
      SELECT json_build_object(
        'replied', COUNT(*) FILTER (WHERE response_status = 'replied'),
        'waiting', COUNT(*) FILTER (WHERE response_status = 'waiting'),
        'never', COUNT(*) FILTER (WHERE response_status = 'never')
      )
      FROM mv_whatsapp_conversation_stats
      WHERE last_message_at > NOW() - INTERVAL '90 days'
    )
  );
END;
$$;