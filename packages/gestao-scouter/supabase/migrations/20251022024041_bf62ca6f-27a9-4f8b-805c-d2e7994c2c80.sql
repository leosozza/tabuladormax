-- Criar tabela app_settings que está faltando
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy de leitura para usuários autenticados
CREATE POLICY "app_settings_read" ON public.app_settings
FOR SELECT TO authenticated, anon
USING (true);

-- Policy de escrita para usuários autenticados
CREATE POLICY "app_settings_write" ON public.app_settings
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Adicionar coluna position na tabela dashboard_indicator_configs
ALTER TABLE public.dashboard_indicator_configs 
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;