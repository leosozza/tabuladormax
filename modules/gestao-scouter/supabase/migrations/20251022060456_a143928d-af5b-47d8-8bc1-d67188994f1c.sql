-- Adicionar campo last_synced_at para controle de sincronização
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_leads_last_synced_at 
  ON leads(last_synced_at);