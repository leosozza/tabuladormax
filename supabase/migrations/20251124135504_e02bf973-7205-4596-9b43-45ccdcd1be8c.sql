-- ============================================
-- Atualizar funções para usar presenca_confirmada
-- ============================================

-- 1. Atualizar get_general_stats
CREATE OR REPLACE FUNCTION get_general_stats()
RETURNS TABLE (
  total_leads BIGINT,
  confirmados BIGINT,
  compareceram BIGINT,
  valor_total NUMERIC,
  leads_hoje BIGINT,
  leads_semana BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(l.id) as total_leads,
    COUNT(l.id) FILTER (WHERE l.ficha_confirmada = true) as confirmados,
    -- Alterado: usar presenca_confirmada ao invés de compareceu
    COUNT(l.id) FILTER (WHERE l.presenca_confirmada = true) as compareceram,
    COALESCE(SUM(l.valor_ficha), 0) as valor_total,
    COUNT(l.id) FILTER (WHERE l.criado::date = CURRENT_DATE) as leads_hoje,
    COUNT(l.id) FILTER (WHERE l.criado::date >= CURRENT_DATE - INTERVAL '7 days') as leads_semana
  FROM leads l;
END;
$$;

-- 2. Atualizar get_source_analysis
CREATE OR REPLACE FUNCTION get_source_analysis(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS TABLE (
  fonte_normalizada text,
  total bigint,
  confirmados bigint,
  compareceram bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(l.fonte_normalizada, 'Outros') as fonte_normalizada,
    COUNT(l.id) as total,
    COUNT(l.id) FILTER (WHERE l.ficha_confirmada = true) as confirmados,
    -- Alterado: usar presenca_confirmada ao invés de compareceu
    COUNT(l.id) FILTER (WHERE l.presenca_confirmada = true) as compareceram
  FROM leads l
  WHERE 
    (p_start_date IS NULL OR l.criado >= p_start_date)
    AND (p_end_date IS NULL OR l.criado <= p_end_date)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR l.scouter = p_scouter)
    AND (p_fonte IS NULL OR l.fonte_normalizada = p_fonte)
  GROUP BY fonte_normalizada
  ORDER BY total DESC;
END;
$$;