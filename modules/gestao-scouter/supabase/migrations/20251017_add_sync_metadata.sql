-- Adicionar campo metadata à tabela sync_logs
-- Este campo armazena informações adicionais sobre cada sincronização

ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Adicionar campos à tabela fichas para suportar sincronização
ALTER TABLE fichas 
ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'Gestao',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN sync_logs.metadata IS 'Metadados adicionais sobre a sincronização (batch_id, source, detalhes)';
COMMENT ON COLUMN fichas.sync_source IS 'Origem da última sincronização (Gestao, TabuladorMax)';
COMMENT ON COLUMN fichas.last_synced_at IS 'Timestamp da última sincronização bem-sucedida';

-- Índice para melhorar performance de queries de sincronização
CREATE INDEX IF NOT EXISTS idx_fichas_last_synced ON fichas(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON fichas(sync_source);
