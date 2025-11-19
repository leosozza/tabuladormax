-- Criar função RPC otimizada para calcular estatísticas de leads
CREATE OR REPLACE FUNCTION get_leads_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total BIGINT,
  confirmados BIGINT,
  compareceram BIGINT,
  pendentes BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE ficha_confirmada = true)::BIGINT as confirmados,
    COUNT(*) FILTER (WHERE compareceu = true)::BIGINT as compareceram,
    COUNT(*) FILTER (WHERE qualidade_lead IS NULL)::BIGINT as pendentes
  FROM leads
  WHERE 
    -- Filtro de data opcional (NULL = ignora)
    (p_start_date IS NULL OR criado >= p_start_date)
    AND (p_end_date IS NULL OR criado <= p_end_date)
    -- Filtro de projeto opcional
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    -- Filtro de scouter opcional
    AND (p_scouter IS NULL OR scouter = p_scouter);
END;
$$ LANGUAGE plpgsql STABLE;

-- Criar índices para performance máxima
CREATE INDEX IF NOT EXISTS idx_leads_criado ON leads(criado);
CREATE INDEX IF NOT EXISTS idx_leads_ficha_confirmada ON leads(ficha_confirmada) WHERE ficha_confirmada = true;
CREATE INDEX IF NOT EXISTS idx_leads_compareceu ON leads(compareceu) WHERE compareceu = true;
CREATE INDEX IF NOT EXISTS idx_leads_qualidade_lead_null ON leads(qualidade_lead) WHERE qualidade_lead IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_criado_project_scouter ON leads(criado, commercial_project_id, scouter);

COMMENT ON FUNCTION get_leads_stats IS 'Calcula estatísticas de leads de forma otimizada usando agregação no servidor. Aceita filtros opcionais de data, projeto e scouter.';