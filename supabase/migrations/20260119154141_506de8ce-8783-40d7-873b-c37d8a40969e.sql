-- =============================================
-- FASE 1: LIMPEZA E OTIMIZAÇÃO DO BANCO
-- =============================================

-- 1.1 Criar índice para acelerar limpeza de sync_events (sem CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at 
ON sync_events(created_at);

-- 1.2 Criar função de limpeza automática de sync_events
CREATE OR REPLACE FUNCTION cleanup_old_sync_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sync_events 
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.3 Criar função de limpeza de message_rate_limits antigos
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM message_rate_limits 
  WHERE window_start < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.4 Criar função de limpeza de actions_log antigos
CREATE OR REPLACE FUNCTION cleanup_old_actions_log(days_to_keep INTEGER DEFAULT 60)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM actions_log 
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.5 Criar função mestre de manutenção
CREATE OR REPLACE FUNCTION run_database_maintenance()
RETURNS TABLE(
  table_name TEXT,
  deleted_rows INTEGER
) AS $$
BEGIN
  -- Limpar sync_events (manter 30 dias)
  RETURN QUERY SELECT 'sync_events'::TEXT, cleanup_old_sync_events(30);
  
  -- Limpar message_rate_limits (manter 7 dias)
  RETURN QUERY SELECT 'message_rate_limits'::TEXT, cleanup_old_rate_limits(7);
  
  -- Limpar actions_log (manter 60 dias)
  RETURN QUERY SELECT 'actions_log'::TEXT, cleanup_old_actions_log(60);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.6 Otimizar configuração de autovacuum para tabelas grandes
ALTER TABLE leads SET (
  autovacuum_vacuum_threshold = 50000,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 25000,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE sync_events SET (
  autovacuum_vacuum_threshold = 10000,
  autovacuum_vacuum_scale_factor = 0.01
);

ALTER TABLE chatwoot_contacts SET (
  autovacuum_vacuum_threshold = 5000,
  autovacuum_vacuum_scale_factor = 0.05
);