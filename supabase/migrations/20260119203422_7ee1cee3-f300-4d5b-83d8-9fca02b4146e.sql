-- Tabela para histórico de sincronizações de leads faltantes
CREATE TABLE public.missing_leads_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
  
  -- Filtros usados
  scouter_name TEXT,
  date_from DATE,
  date_to DATE,
  
  -- Resultados
  bitrix_total INTEGER DEFAULT 0,
  db_total INTEGER DEFAULT 0,
  missing_count INTEGER DEFAULT 0,
  synced_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Detalhes de erros
  error_details JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.missing_leads_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todos autenticados podem ver)
CREATE POLICY "Authenticated users can view sync jobs"
ON public.missing_leads_sync_jobs
FOR SELECT
TO authenticated
USING (true);

-- Policy para inserção (todos autenticados podem criar)
CREATE POLICY "Authenticated users can create sync jobs"
ON public.missing_leads_sync_jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy para atualização (todos autenticados podem atualizar)
CREATE POLICY "Authenticated users can update sync jobs"
ON public.missing_leads_sync_jobs
FOR UPDATE
TO authenticated
USING (true);

-- Índices para performance
CREATE INDEX idx_missing_leads_sync_jobs_status ON public.missing_leads_sync_jobs(status);
CREATE INDEX idx_missing_leads_sync_jobs_created_at ON public.missing_leads_sync_jobs(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_missing_leads_sync_jobs_updated_at
BEFORE UPDATE ON public.missing_leads_sync_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();