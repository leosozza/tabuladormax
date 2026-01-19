-- Corrigir função get_maintenance_stats - remover coluna inexistente
CREATE OR REPLACE FUNCTION get_maintenance_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'sync_events', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM sync_events), 0),
      'older_than_30_days', COALESCE((SELECT COUNT(*) FROM sync_events WHERE created_at < NOW() - INTERVAL '30 days'), 0),
      'oldest_record', (SELECT MIN(created_at) FROM sync_events),
      'newest_record', (SELECT MAX(created_at) FROM sync_events)
    ),
    'actions_log', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM actions_log), 0),
      'older_than_60_days', COALESCE((SELECT COUNT(*) FROM actions_log WHERE created_at < NOW() - INTERVAL '60 days'), 0),
      'oldest_record', (SELECT MIN(created_at) FROM actions_log),
      'newest_record', (SELECT MAX(created_at) FROM actions_log)
    ),
    'message_rate_limits', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM message_rate_limits), 0),
      'older_than_7_days', COALESCE((SELECT COUNT(*) FROM message_rate_limits WHERE sent_at < NOW() - INTERVAL '7 days'), 0),
      'oldest_record', (SELECT MIN(sent_at) FROM message_rate_limits),
      'newest_record', (SELECT MAX(sent_at) FROM message_rate_limits)
    ),
    'leads', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM leads), 0),
      'oldest_record', (SELECT MIN(created_at) FROM leads),
      'newest_record', (SELECT MAX(created_at) FROM leads)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;