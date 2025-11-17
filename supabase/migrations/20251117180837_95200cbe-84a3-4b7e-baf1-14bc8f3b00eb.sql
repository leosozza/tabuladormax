-- Tabela para controle de jobs de resincronização
CREATE TABLE IF NOT EXISTS lead_resync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  
  -- Contadores
  total_leads INTEGER DEFAULT 0,
  processed_leads INTEGER DEFAULT 0,
  updated_leads INTEGER DEFAULT 0,
  skipped_leads INTEGER DEFAULT 0,
  error_leads INTEGER DEFAULT 0,
  
  -- Configuração
  filter_criteria JSONB DEFAULT '{}',
  batch_size INTEGER DEFAULT 50,
  priority_fields TEXT[] DEFAULT ARRAY['address', 'telefone_trabalho', 'valor_ficha'],
  
  -- Controle
  last_processed_lead_id BIGINT,
  current_batch INTEGER DEFAULT 0,
  estimated_completion TIMESTAMPTZ,
  
  -- Erros
  error_details JSONB DEFAULT '[]',
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_resync_jobs_status ON lead_resync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_resync_jobs_created_by ON lead_resync_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_resync_jobs_created_at ON lead_resync_jobs(created_at DESC);

-- RLS
ALTER TABLE lead_resync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar jobs de resincronização"
  ON lead_resync_jobs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_lead_resync_jobs_updated_at
  BEFORE UPDATE ON lead_resync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Remover duplicados da tabela bitrix_field_mappings (manter o mais recente)
DELETE FROM bitrix_field_mappings a
USING bitrix_field_mappings b
WHERE a.id < b.id
  AND a.bitrix_field = b.bitrix_field
  AND a.tabuladormax_field = b.tabuladormax_field;

-- Adicionar constraint UNIQUE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bitrix_field_mappings_unique_pair'
  ) THEN
    ALTER TABLE bitrix_field_mappings 
    ADD CONSTRAINT bitrix_field_mappings_unique_pair 
    UNIQUE (bitrix_field, tabuladormax_field);
  END IF;
END $$;