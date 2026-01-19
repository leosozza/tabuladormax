-- Função para obter estatísticas de manutenção
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
      'older_than_30_days', COALESCE((SELECT COUNT(*) FROM sync_events WHERE created_at < NOW() - INTERVAL '30 days'), 0)
    ),
    'actions_log', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM actions_log), 0),
      'older_than_60_days', COALESCE((SELECT COUNT(*) FROM actions_log WHERE created_at < NOW() - INTERVAL '60 days'), 0)
    ),
    'message_rate_limits', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM message_rate_limits), 0),
      'older_than_7_days', COALESCE((SELECT COUNT(*) FROM message_rate_limits WHERE window_start < NOW() - INTERVAL '7 days'), 0)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Função de limpeza em lote para sync_events
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
BEGIN
  WITH to_delete AS (
    SELECT id FROM sync_events
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    LIMIT batch_size
  )
  DELETE FROM sync_events
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'batch_size', batch_size,
    'days_kept', days_to_keep
  );
END;
$$;

-- Função de limpeza em lote para actions_log
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
BEGIN
  WITH to_delete AS (
    SELECT id FROM actions_log
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    LIMIT batch_size
  )
  DELETE FROM actions_log
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'batch_size', batch_size,
    'days_kept', days_to_keep
  );
END;
$$;

-- Função de limpeza em lote para message_rate_limits
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
BEGIN
  WITH to_delete AS (
    SELECT id FROM message_rate_limits
    WHERE window_start < NOW() - (days_to_keep || ' days')::INTERVAL
    LIMIT batch_size
  )
  DELETE FROM message_rate_limits
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'deleted', deleted_count,
    'batch_size', batch_size,
    'days_kept', days_to_keep
  );
END;
$$;

-- Índices para performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_actions_log_created_at_desc ON actions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON sync_events(created_at);