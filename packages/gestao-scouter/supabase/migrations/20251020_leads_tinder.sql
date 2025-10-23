-- ============================================================================
-- 20251005_leads_tinder.sql
-- Colunas para análise Tinder de Leads com rastreamento de decisões
-- ============================================================================

-- Adicionar colunas de rastreamento de análise à tabela fichas
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS match_analisado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_analisado_em TIMESTAMPTZ;

-- Adicionar colunas de rastreamento de análise à tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS match_analisado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_analisado_em TIMESTAMPTZ;

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_fichas_match_analisado ON public.fichas(match_analisado_por, match_analisado_em);
CREATE INDEX IF NOT EXISTS idx_leads_match_analisado ON public.leads(match_analisado_por, match_analisado_em);
CREATE INDEX IF NOT EXISTS idx_fichas_aprovado_null ON public.fichas(aprovado) WHERE aprovado IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_aprovado_null ON public.leads(aprovado) WHERE aprovado IS NULL;

-- RPC: set_lead_match
-- Salva a decisão de aprovação/reprovação de um lead no Tinder
CREATE OR REPLACE FUNCTION public.set_lead_match(
  lead_id TEXT,
  is_approved BOOLEAN,
  table_name TEXT DEFAULT 'leads'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obter o ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Atualizar o lead na tabela especificada
  IF table_name = 'fichas' THEN
    UPDATE public.fichas
    SET 
      aprovado = is_approved,
      match_analisado_por = current_user_id,
      match_analisado_em = now(),
      updated_at = now()
    WHERE id = lead_id;
  ELSIF table_name = 'leads' THEN
    UPDATE public.leads
    SET 
      aprovado = is_approved,
      match_analisado_por = current_user_id,
      match_analisado_em = now(),
      updated_at = now()
    WHERE id = lead_id::TEXT;
  ELSE
    RAISE EXCEPTION 'Tabela inválida: %. Use "fichas" ou "leads"', table_name;
  END IF;
  
  RETURN FOUND;
END;
$$;

-- RPC: get_pending_tinder_leads
-- Retorna leads não analisados para o Tinder
CREATE OR REPLACE FUNCTION public.get_pending_tinder_leads(
  limit_count INT DEFAULT 50,
  table_name TEXT DEFAULT 'leads'
)
RETURNS TABLE (
  id TEXT,
  nome TEXT,
  idade TEXT,
  scouter TEXT,
  projeto TEXT,
  etapa TEXT,
  local_da_abordagem TEXT,
  ficha_confirmada TEXT,
  presenca_confirmada TEXT,
  supervisor_do_scouter TEXT,
  foto TEXT,
  aprovado BOOLEAN,
  criado TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF table_name = 'fichas' THEN
    RETURN QUERY
    SELECT 
      f.id,
      (f.raw->>'nome')::TEXT AS nome,
      (f.raw->>'idade')::TEXT AS idade,
      f.scouter,
      f.projeto,
      (f.raw->>'etapa')::TEXT AS etapa,
      (f.raw->>'local_da_abordagem')::TEXT AS local_da_abordagem,
      (f.raw->>'ficha_confirmada')::TEXT AS ficha_confirmada,
      (f.raw->>'presenca_confirmada')::TEXT AS presenca_confirmada,
      (f.raw->>'supervisor_do_scouter')::TEXT AS supervisor_do_scouter,
      (f.raw->>'foto')::TEXT AS foto,
      f.aprovado,
      f.criado::TIMESTAMPTZ
    FROM public.fichas f
    WHERE f.aprovado IS NULL 
      AND f.deleted = false
    ORDER BY f.criado DESC
    LIMIT limit_count;
  ELSIF table_name = 'leads' THEN
    RETURN QUERY
    SELECT 
      l.id,
      l.name::TEXT AS nome,
      l.age::TEXT AS idade,
      l.scouter,
      '' AS projeto, -- leads doesn't have projeto column
      l.etapa,
      l.local_abordagem AS local_da_abordagem,
      CASE WHEN l.ficha_confirmada THEN 'Sim' ELSE 'Não' END AS ficha_confirmada,
      CASE WHEN l.presenca_confirmada THEN 'Sim' ELSE 'Não' END AS presenca_confirmada,
      '' AS supervisor_do_scouter, -- leads doesn't have this column
      l.photo_url AS foto,
      l.aprovado,
      l.criado
    FROM public.leads l
    WHERE l.aprovado IS NULL 
      AND l.deleted = false
    ORDER BY l.criado DESC
    LIMIT limit_count;
  ELSE
    RAISE EXCEPTION 'Tabela inválida: %. Use "fichas" ou "leads"', table_name;
  END IF;
END;
$$;

-- Comentários para documentação
COMMENT ON COLUMN public.fichas.match_analisado_por IS 'Usuário que analisou o lead no Tinder';
COMMENT ON COLUMN public.fichas.match_analisado_em IS 'Timestamp da análise no Tinder';
COMMENT ON COLUMN public.leads.match_analisado_por IS 'Usuário que analisou o lead no Tinder';
COMMENT ON COLUMN public.leads.match_analisado_em IS 'Timestamp da análise no Tinder';

COMMENT ON FUNCTION public.set_lead_match IS 'Salva a decisão de aprovação/reprovação de um lead no Tinder';
COMMENT ON FUNCTION public.get_pending_tinder_leads IS 'Retorna leads não analisados para análise Tinder';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_lead_match(TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_tinder_leads(INT, TEXT) TO authenticated;

-- RLS policies para as novas colunas (herdam das policies existentes da tabela)
-- Nenhuma policy adicional necessária, pois as tabelas já têm RLS configurado
