-- ============================================
-- Tabela de Jobs para Exportação em Lote para gestao-scouter
-- ============================================

CREATE TABLE IF NOT EXISTS public.gestao_scouter_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  start_date DATE NOT NULL, -- Data inicial (mais recente)
  end_date DATE, -- Data final (mais antiga) - NULL = ir até o começo
  processing_date DATE, -- Data sendo processada atualmente
  last_completed_date DATE, -- Última data completamente processada
  
  -- Contadores
  total_leads INTEGER DEFAULT 0,
  exported_leads INTEGER DEFAULT 0,
  error_leads INTEGER DEFAULT 0,
  
  -- Controle de pausas
  pause_reason TEXT,
  paused_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_status ON public.gestao_scouter_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_created_by ON public.gestao_scouter_export_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_created_at ON public.gestao_scouter_export_jobs(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_gestao_scouter_export_jobs_updated_at
  BEFORE UPDATE ON public.gestao_scouter_export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.gestao_scouter_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export jobs"
  ON public.gestao_scouter_export_jobs FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create export jobs"
  ON public.gestao_scouter_export_jobs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own export jobs"
  ON public.gestao_scouter_export_jobs FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Habilitar Realtime para monitorar progresso
ALTER PUBLICATION supabase_realtime ADD TABLE public.gestao_scouter_export_jobs;

-- Comentários
COMMENT ON TABLE public.gestao_scouter_export_jobs IS 'Jobs de exportação em lote de leads para gestao-scouter';
COMMENT ON COLUMN public.gestao_scouter_export_jobs.start_date IS 'Data inicial (mais recente) para exportação';
COMMENT ON COLUMN public.gestao_scouter_export_jobs.end_date IS 'Data final (mais antiga) - NULL exporta tudo';
COMMENT ON COLUMN public.gestao_scouter_export_jobs.processing_date IS 'Data sendo processada no momento';
