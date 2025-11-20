-- FASE 1: Adicionar campos de diagnóstico de erros de sincronização
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS sync_errors JSONB,
  ADD COLUMN IF NOT EXISTS has_sync_errors BOOLEAN DEFAULT false;

-- Índice para performance em queries de leads problemáticos
CREATE INDEX IF NOT EXISTS idx_leads_has_sync_errors 
  ON leads(has_sync_errors) 
  WHERE has_sync_errors = true;

-- Comentários de documentação
COMMENT ON COLUMN leads.sync_errors IS 
  'Detalhes de erros de sincronização por campo (timestamp, field, error, attempted_value)';
COMMENT ON COLUMN leads.has_sync_errors IS 
  'Flag rápida para identificar leads com problemas de sincronização';

-- FASE 6: Garantir que RLS permite visualização de leads com erros
COMMENT ON POLICY "Users can view accessible leads" ON leads IS
  'Permite visualização de leads acessíveis, INCLUINDO aqueles com sync_errors para facilitar diagnóstico';