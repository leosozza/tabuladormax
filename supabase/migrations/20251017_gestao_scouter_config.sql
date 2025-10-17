-- ============================================
-- Tabela de Configuração gestao_scouter_config
-- ============================================

-- Criar tabela gestao_scouter_config
CREATE TABLE IF NOT EXISTS public.gestao_scouter_config (
  id SERIAL PRIMARY KEY,
  project_url TEXT,
  anon_key TEXT,
  active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false
);

-- Habilitar Row Level Security (RLS) na tabela
ALTER TABLE public.gestao_scouter_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para SELECT público
CREATE POLICY "Allow public SELECT on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR SELECT
  USING (true);

-- Políticas RLS para INSERT público
CREATE POLICY "Allow public INSERT on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR INSERT
  WITH CHECK (true);

-- Políticas RLS para UPDATE público
CREATE POLICY "Allow public UPDATE on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para DELETE público
CREATE POLICY "Allow public DELETE on gestao_scouter_config"
  ON public.gestao_scouter_config
  FOR DELETE
  USING (true);

-- Comentários explicativos
COMMENT ON TABLE public.gestao_scouter_config IS 'Configuração de sincronização com projeto gestao-scouter';
COMMENT ON COLUMN public.gestao_scouter_config.id IS 'Identificador único sequencial';
COMMENT ON COLUMN public.gestao_scouter_config.project_url IS 'URL do projeto Supabase gestao-scouter';
COMMENT ON COLUMN public.gestao_scouter_config.anon_key IS 'Chave anônima (anon key) do projeto';
COMMENT ON COLUMN public.gestao_scouter_config.active IS 'Indica se a configuração está ativa';
COMMENT ON COLUMN public.gestao_scouter_config.sync_enabled IS 'Indica se a sincronização está habilitada';
