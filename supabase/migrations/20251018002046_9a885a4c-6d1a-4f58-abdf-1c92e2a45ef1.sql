-- ============================================
-- Migration: Sincronização TabuladorMax <-> Gestão Scouter
-- ============================================

-- 1. Criar tabela de configuração do Gestão Scouter
CREATE TABLE IF NOT EXISTS public.gestao_scouter_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_url text NOT NULL,
  anon_key text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comentários
COMMENT ON TABLE public.gestao_scouter_config IS 'Configuração de sincronização com projeto gestao-scouter';
COMMENT ON COLUMN public.gestao_scouter_config.project_url IS 'URL do projeto Supabase gestao-scouter (ex: https://ngestyxtopvfeyenyvgt.supabase.co)';
COMMENT ON COLUMN public.gestao_scouter_config.anon_key IS 'Chave anônima (anon key) do projeto gestao-scouter';
COMMENT ON COLUMN public.gestao_scouter_config.active IS 'Indica se a configuração está ativa';
COMMENT ON COLUMN public.gestao_scouter_config.sync_enabled IS 'Indica se a sincronização está habilitada';

-- RLS
ALTER TABLE public.gestao_scouter_config ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Admins can manage gestao_scouter_config" ON public.gestao_scouter_config;
CREATE POLICY "Admins can manage gestao_scouter_config"
  ON public.gestao_scouter_config FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_config_active 
  ON public.gestao_scouter_config(active) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_gestao_scouter_config_sync_enabled 
  ON public.gestao_scouter_config(sync_enabled) 
  WHERE sync_enabled = true;

-- Trigger para updated_at
CREATE TRIGGER update_gestao_scouter_config_updated_at
  BEFORE UPDATE ON public.gestao_scouter_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Criar tabela de jobs de exportação para Gestão Scouter
CREATE TABLE IF NOT EXISTS public.gestao_scouter_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date,
  processing_date date,
  last_completed_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  total_leads integer DEFAULT 0,
  exported_leads integer DEFAULT 0,
  error_leads integer DEFAULT 0,
  pause_reason text,
  paused_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comentários
COMMENT ON TABLE public.gestao_scouter_export_jobs IS 'Jobs de exportação em lote para Gestão Scouter';

-- RLS
ALTER TABLE public.gestao_scouter_export_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Admins can manage export jobs" ON public.gestao_scouter_export_jobs;
CREATE POLICY "Admins can manage export jobs"
  ON public.gestao_scouter_export_jobs FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Users can view own export jobs" ON public.gestao_scouter_export_jobs;
CREATE POLICY "Users can view own export jobs"
  ON public.gestao_scouter_export_jobs FOR SELECT
  USING (created_by = auth.uid());

-- Índices
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_status 
  ON public.gestao_scouter_export_jobs(status);

CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_created_by 
  ON public.gestao_scouter_export_jobs(created_by);

-- Trigger para updated_at
CREATE TRIGGER update_gestao_scouter_export_jobs_updated_at
  BEFORE UPDATE ON public.gestao_scouter_export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Inserir configuração padrão do Gestão Scouter
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://ngestyxtopvfeyenyvgt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZXN0eXh0b3B2ZmV5ZW55dmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM0MjEsImV4cCI6MjA3NTQyOTQyMX0.Vk22kFAD0GwVMmcJgHkNnz0P56_gK1wFQcw7tus8syc',
  true,
  true
)
ON CONFLICT DO NOTHING;

-- 4. Adicionar direções de sync para gestao-scouter nos eventos de sincronização
-- (Validar que sync_events aceita as novas direções)
DO $$
BEGIN
  -- Verificar se a constraint existe antes de tentar modificá-la
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sync_events_direction_check'
  ) THEN
    -- Remover constraint antiga
    ALTER TABLE public.sync_events DROP CONSTRAINT sync_events_direction_check;
  END IF;
  
  -- Adicionar nova constraint com todas as direções
  ALTER TABLE public.sync_events 
    ADD CONSTRAINT sync_events_direction_check 
    CHECK (direction IN (
      'bitrix_to_supabase',
      'supabase_to_bitrix',
      'csv_to_supabase',
      'supabase_to_gestao_scouter',
      'gestao_scouter_to_supabase'
    ));
END $$;