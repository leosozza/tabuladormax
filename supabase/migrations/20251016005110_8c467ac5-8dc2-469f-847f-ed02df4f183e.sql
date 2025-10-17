-- Criar tabela para controlar jobs de importação do Bitrix
CREATE TABLE public.bitrix_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'paused', 'completed', 'error'
  
  -- Configuração de datas
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Progresso
  processing_date DATE,
  last_completed_date DATE,
  total_leads INTEGER DEFAULT 0,
  imported_leads INTEGER DEFAULT 0,
  error_leads INTEGER DEFAULT 0,
  
  -- Controle
  pause_reason TEXT,
  batch_size INTEGER DEFAULT 50,
  
  -- Metadados
  error_details JSONB,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_bitrix_import_jobs_status ON public.bitrix_import_jobs(status);
CREATE INDEX idx_bitrix_import_jobs_processing_date ON public.bitrix_import_jobs(processing_date);

-- Trigger para updated_at
CREATE TRIGGER update_bitrix_import_jobs_updated_at
  BEFORE UPDATE ON public.bitrix_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bitrix_import_jobs;

-- RLS (apenas admins)
ALTER TABLE public.bitrix_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import jobs"
  ON public.bitrix_import_jobs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));