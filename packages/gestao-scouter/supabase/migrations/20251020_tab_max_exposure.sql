-- ============================================================================
-- 20251020_tab_max_exposure.sql
-- Views públicas para sincronização com TabuladorMax
-- ============================================================================
-- Este script cria views públicas que expõem as tabelas relevantes
-- para sincronização com o TabuladorMax via Edge Function
--
-- NOTA: A aplicação migrou de 'fichas' para 'leads' como fonte única de verdade.
-- As views fichas_sync são mantidas para compatibilidade retroativa.

-- View pública de leads (PRINCIPAL - fonte única de verdade)
CREATE OR REPLACE VIEW public.leads_sync AS
SELECT 
  id,
  name,
  nome,
  age,
  scouter,
  responsible,
  etapa,
  criado,
  ficha_confirmada,
  presenca_confirmada,
  compareceu,
  aprovado,
  valor_ficha,
  local_abordagem,
  telefone,
  email,
  projeto,
  sync_source,
  sync_status,
  last_sync_at,
  created_at,
  updated_at,
  deleted,
  raw
FROM public.leads
WHERE deleted = false;

-- View pública de fichas (COMPATIBILIDADE - deprecated, use leads_sync)
CREATE OR REPLACE VIEW public.fichas_sync AS
SELECT 
  id,
  scouter,
  projeto,
  criado,
  valor_ficha,
  deleted,
  aprovado,
  created_at,
  updated_at,
  -- Extrair campos específicos do raw JSONB
  raw->>'nome' AS nome,
  raw->>'idade' AS idade,
  raw->>'telefone' AS telefone,
  raw->>'email' AS email,
  raw->>'etapa' AS etapa,
  raw->>'local_da_abordagem' AS local_da_abordagem,
  raw->>'ficha_confirmada' AS ficha_confirmada,
  raw->>'presenca_confirmada' AS presenca_confirmada,
  raw->>'supervisor_do_scouter' AS supervisor_do_scouter
FROM public.fichas
WHERE deleted = false;

-- View de configuração do TabuladorMax
CREATE OR REPLACE VIEW public.tabulador_config_sync AS
SELECT 
  id,
  project_id,
  url,
  enabled,
  created_at,
  updated_at
FROM public.tabulador_config
WHERE enabled = true;

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_leads_sync_updated ON public.leads(updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_leads_sync_source ON public.leads(sync_source);
-- Manter índices de fichas caso a tabela ainda exista
CREATE INDEX IF NOT EXISTS idx_fichas_sync_updated ON public.fichas(updated_at) WHERE deleted = false AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fichas');
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON public.fichas((raw->>'sync_source')) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fichas');

-- RLS para views (permitir leitura via service_role)
-- Nota: Edge Functions usam service_role e podem acessar diretamente

-- Comentários para documentação
COMMENT ON VIEW public.leads_sync IS 'View pública de leads para sincronização com TabuladorMax (PRINCIPAL)';
COMMENT ON VIEW public.fichas_sync IS 'View pública de fichas para compatibilidade retroativa (DEPRECATED - use leads_sync)';
COMMENT ON VIEW public.tabulador_config_sync IS 'Configuração ativa do TabuladorMax';

-- Grant select to service_role and authenticated
GRANT SELECT ON public.leads_sync TO service_role, authenticated;
GRANT SELECT ON public.fichas_sync TO service_role, authenticated;
GRANT SELECT ON public.tabulador_config_sync TO service_role, authenticated;

-- Função auxiliar para introspecção de schema
-- Permite à Edge Function descobrir colunas disponíveis dinamicamente
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    column_name::TEXT,
    data_type::TEXT,
    is_nullable::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = $1
  ORDER BY ordinal_position;
$$;

COMMENT ON FUNCTION public.get_table_columns IS 'Retorna as colunas de uma tabela para introspecção de schema';
GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO service_role, authenticated;
