-- ============================================
-- Sincronização TabuladorMax ↔ gestao-scouter
-- ============================================

-- 1. Criar tabela de configuração para gestao-scouter
CREATE TABLE IF NOT EXISTS public.gestao_scouter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_url TEXT NOT NULL, -- URL do projeto Supabase gestao-scouter
  service_role_key_encrypted TEXT, -- Chave criptografada (usar vault.secrets)
  anon_key TEXT, -- Chave pública anon para leitura
  active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Apenas admins podem gerenciar
ALTER TABLE public.gestao_scouter_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gestao_scouter_config"
  ON public.gestao_scouter_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_gestao_scouter_config_updated_at
  BEFORE UPDATE ON public.gestao_scouter_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. Atualizar sync_events para suportar gestao-scouter
-- Adicionar novos valores ao CHECK constraint de direction
ALTER TABLE public.sync_events DROP CONSTRAINT IF EXISTS sync_events_direction_check;
ALTER TABLE public.sync_events ADD CONSTRAINT sync_events_direction_check 
  CHECK (direction IN (
    'bitrix_to_supabase', 
    'supabase_to_bitrix', 
    'csv_import',
    'supabase_to_gestao_scouter',
    'gestao_scouter_to_supabase'
  ));

-- 3. Criar índice adicional para facilitar queries por gestao-scouter
CREATE INDEX IF NOT EXISTS idx_sync_events_direction_gestao_scouter 
  ON public.sync_events(direction) 
  WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase');

-- 4. Atualizar constraint de sync_source na leads para incluir gestao-scouter
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_sync_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_sync_source_check 
  CHECK (sync_source IN ('bitrix', 'supabase', 'gestao_scouter', 'csv'));

-- 5. Comentários explicativos
COMMENT ON TABLE public.gestao_scouter_config IS 'Configuração de sincronização com projeto gestao-scouter';
COMMENT ON COLUMN public.gestao_scouter_config.project_url IS 'URL completa do projeto Supabase gestao-scouter (ex: https://xxx.supabase.co)';
COMMENT ON COLUMN public.gestao_scouter_config.service_role_key_encrypted IS 'Service role key criptografada para autenticação nas operações de sincronização';
COMMENT ON COLUMN public.gestao_scouter_config.sync_enabled IS 'Flag para ativar/desativar sincronização sem remover a configuração';
