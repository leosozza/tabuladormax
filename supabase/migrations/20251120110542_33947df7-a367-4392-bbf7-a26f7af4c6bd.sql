-- FASE 1: Adicionar colunas de rastreamento de mapeamento à sync_events
ALTER TABLE sync_events 
  ADD COLUMN IF NOT EXISTS field_mappings JSONB,
  ADD COLUMN IF NOT EXISTS fields_synced_count INTEGER DEFAULT 0;

-- Criar índices para melhorar consultas
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at 
  ON sync_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_events_event_type 
  ON sync_events(event_type);

CREATE INDEX IF NOT EXISTS idx_sync_events_status 
  ON sync_events(status);

-- Comentários para documentação
COMMENT ON COLUMN sync_events.field_mappings IS 
  'JSONB detalhando quais campos foram mapeados durante a sincronização';
COMMENT ON COLUMN sync_events.fields_synced_count IS 
  'Contador de quantos campos foram sincronizados nesta operação';