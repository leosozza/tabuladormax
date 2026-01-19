-- Recriar função get_maintenance_stats com correções
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
      'with_sync_errors', COALESCE((SELECT COUNT(*) FROM leads WHERE last_sync_status = 'error'), 0),
      'oldest_record', (SELECT MIN(created_at) FROM leads),
      'newest_record', (SELECT MAX(created_at) FROM leads)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Recriar função cleanup_rate_limits_batch usando sent_at
CREATE OR REPLACE FUNCTION cleanup_rate_limits_batch(
  days_to_keep INT DEFAULT 7,
  batch_size INT DEFAULT 5000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
  remaining_count INT;
  cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  WITH to_delete AS (
    SELECT id FROM message_rate_limits
    WHERE sent_at < cutoff
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM message_rate_limits
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  SELECT COUNT(*) INTO remaining_count 
  FROM message_rate_limits 
  WHERE sent_at < cutoff;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'remaining', remaining_count,
    'has_more', remaining_count > 0,
    'cutoff_date', cutoff
  );
END;
$$;

-- Recriar função cleanup_sync_events_batch com formato correto
CREATE OR REPLACE FUNCTION cleanup_sync_events_batch(
  days_to_keep INT DEFAULT 30,
  batch_size INT DEFAULT 5000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
  remaining_count INT;
  cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  WITH to_delete AS (
    SELECT id FROM sync_events
    WHERE created_at < cutoff
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM sync_events
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  SELECT COUNT(*) INTO remaining_count 
  FROM sync_events 
  WHERE created_at < cutoff;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'remaining', remaining_count,
    'has_more', remaining_count > 0,
    'cutoff_date', cutoff
  );
END;
$$;

-- Recriar função cleanup_actions_log_batch com formato correto
CREATE OR REPLACE FUNCTION cleanup_actions_log_batch(
  days_to_keep INT DEFAULT 60,
  batch_size INT DEFAULT 5000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
  remaining_count INT;
  cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  WITH to_delete AS (
    SELECT id FROM actions_log
    WHERE created_at < cutoff
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM actions_log
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  SELECT COUNT(*) INTO remaining_count 
  FROM actions_log 
  WHERE created_at < cutoff;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'remaining', remaining_count,
    'has_more', remaining_count > 0,
    'cutoff_date', cutoff
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION get_maintenance_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits_batch(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_sync_events_batch(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_actions_log_batch(INT, INT) TO authenticated;