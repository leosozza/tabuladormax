-- ============================================
-- Melhorias para Exportação em Lote - Gestão Scouter
-- ============================================

-- 1. Adicionar coluna fields_selected para permitir seleção de campos
ALTER TABLE public.gestao_scouter_export_jobs 
ADD COLUMN IF NOT EXISTS fields_selected JSONB DEFAULT NULL;

COMMENT ON COLUMN public.gestao_scouter_export_jobs.fields_selected IS 
'Array JSON com os nomes dos campos selecionados para exportação. NULL = todos os campos.';

-- 2. Criar tabela para log detalhado de erros
CREATE TABLE IF NOT EXISTS public.gestao_scouter_export_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.gestao_scouter_export_jobs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Snapshot do lead no momento do erro
  lead_snapshot JSONB NOT NULL,
  
  -- Campos que foram tentados exportar
  fields_sent JSONB NOT NULL,
  
  -- Detalhes do erro
  error_message TEXT NOT NULL,
  error_details JSONB,
  
  -- Response do gestao-scouter se houver
  response_status INTEGER,
  response_body JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para busca rápida
  CONSTRAINT gestao_scouter_export_errors_job_id_fkey 
    FOREIGN KEY (job_id) 
    REFERENCES public.gestao_scouter_export_jobs(id) 
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_errors_job_id 
  ON public.gestao_scouter_export_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_errors_lead_id 
  ON public.gestao_scouter_export_errors(lead_id);
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_errors_created_at 
  ON public.gestao_scouter_export_errors(created_at DESC);

-- RLS para gestao_scouter_export_errors
ALTER TABLE public.gestao_scouter_export_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view errors from own export jobs"
  ON public.gestao_scouter_export_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gestao_scouter_export_jobs j
      WHERE j.id = job_id 
      AND (j.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "System can insert export errors"
  ON public.gestao_scouter_export_errors FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Adicionar policy de DELETE para gestao_scouter_export_jobs
CREATE POLICY "Users can delete own paused export jobs"
  ON public.gestao_scouter_export_jobs FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    AND status = 'paused'
  );

-- 4. Habilitar Realtime para a tabela de erros
ALTER PUBLICATION supabase_realtime ADD TABLE public.gestao_scouter_export_errors;

-- Comentários
COMMENT ON TABLE public.gestao_scouter_export_errors IS 
'Log detalhado de erros durante exportação em lote para gestao-scouter';
COMMENT ON COLUMN public.gestao_scouter_export_errors.lead_snapshot IS 
'Snapshot completo do lead no momento do erro para debug';
COMMENT ON COLUMN public.gestao_scouter_export_errors.fields_sent IS 
'Campos que foram enviados na requisição (baseado em fields_selected)';
COMMENT ON COLUMN public.gestao_scouter_export_errors.error_details IS 
'Detalhes adicionais do erro em formato JSON';
COMMENT ON COLUMN public.gestao_scouter_export_errors.response_body IS 
'Corpo da resposta HTTP do gestao-scouter se disponível';
