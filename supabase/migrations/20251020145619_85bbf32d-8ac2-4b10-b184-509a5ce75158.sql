-- Criar tabela para log detalhado de erros de exportação
CREATE TABLE IF NOT EXISTS public.gestao_scouter_export_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.gestao_scouter_export_jobs(id) ON DELETE CASCADE,
  lead_id BIGINT,
  
  -- Snapshot do lead no momento do erro
  lead_snapshot JSONB NOT NULL,
  
  -- Campos que foram tentados exportar
  fields_sent JSONB NOT NULL,
  
  -- Erro que ocorreu
  error_message TEXT NOT NULL,
  error_details JSONB,
  
  -- Response do gestao-scouter se houver
  response_status INTEGER,
  response_body JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
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