-- ============================================
-- RPC 1: get_leads_chart_data
-- Retorna evolução diária de leads
-- ============================================
CREATE OR REPLACE FUNCTION public.get_leads_chart_data(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_project_id UUID DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL,
  p_fonte TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', date_trunc('day', criado)::date,
        'total', COUNT(*),
        'confirmados', COUNT(*) FILTER (WHERE ficha_confirmada = true),
        'compareceram', COUNT(*) FILTER (WHERE presenca_confirmada = true)
      )
      ORDER BY date_trunc('day', criado)
    )
    FROM leads
    WHERE criado >= p_start_date
      AND criado <= p_end_date
      AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
      AND (p_scouter IS NULL OR scouter = p_scouter)
      AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
    GROUP BY date_trunc('day', criado)
  );
END;
$$;

-- ============================================
-- RPC 2: get_conversion_funnel_data
-- Retorna dados do funil de conversão
-- ============================================
CREATE OR REPLACE FUNCTION public.get_conversion_funnel_data(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL,
  p_fonte TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'confirmados', COUNT(*) FILTER (WHERE ficha_confirmada = true),
      'compareceram', COUNT(*) FILTER (WHERE presenca_confirmada = true)
    )
    FROM leads
    WHERE (p_start_date IS NULL OR criado >= p_start_date)
      AND (p_end_date IS NULL OR criado <= p_end_date)
      AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
      AND (p_scouter IS NULL OR scouter = p_scouter)
      AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
  );
END;
$$;

-- ============================================
-- RPC 3: get_scouter_performance_data
-- Retorna top N scouters com estatísticas
-- ============================================
CREATE OR REPLACE FUNCTION public.get_scouter_performance_data(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL,
  p_fonte TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'scouter', COALESCE(scouter, 'Sem scouter'),
        'total', total,
        'confirmados', confirmados,
        'compareceram', compareceram
      )
      ORDER BY total DESC
    )
    FROM (
      SELECT 
        scouter,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ficha_confirmada = true) as confirmados,
        COUNT(*) FILTER (WHERE presenca_confirmada = true) as compareceram
      FROM leads
      WHERE scouter IS NOT NULL
        AND (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
        AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
        AND (p_scouter IS NULL OR scouter = p_scouter)
        AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
      GROUP BY scouter
      ORDER BY total DESC
      LIMIT p_limit
    ) sub
  );
END;
$$;

-- ============================================
-- RPC 4: get_status_distribution_data
-- Retorna top N etapas com contagens
-- ============================================
CREATE OR REPLACE FUNCTION public.get_status_distribution_data(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL,
  p_fonte TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', etapa,
        'value', count
      )
      ORDER BY count DESC
    )
    FROM (
      SELECT 
        COALESCE(etapa, 'Sem etapa') as etapa,
        COUNT(*) as count
      FROM leads
      WHERE (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
        AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
        AND (p_scouter IS NULL OR scouter = p_scouter)
        AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
      GROUP BY etapa
      ORDER BY count DESC
      LIMIT p_limit
    ) sub
  );
END;
$$;

-- ============================================
-- Comentários para documentação
-- ============================================
COMMENT ON FUNCTION public.get_leads_chart_data IS 'Retorna evolução diária de leads com filtros aplicados';
COMMENT ON FUNCTION public.get_conversion_funnel_data IS 'Retorna dados agregados do funil de conversão';
COMMENT ON FUNCTION public.get_scouter_performance_data IS 'Retorna top N scouters ordenados por total de leads';
COMMENT ON FUNCTION public.get_status_distribution_data IS 'Retorna top N etapas (status) ordenadas por contagem';