-- ========================================
-- FASE 1: Criar função de normalização de fonte
-- ========================================
CREATE OR REPLACE FUNCTION normalize_fonte(raw_fonte text)
RETURNS text AS $$
BEGIN
  RETURN CASE 
    WHEN raw_fonte ILIKE '%meta%' OR raw_fonte ILIKE '%instagram%' OR raw_fonte ILIKE '%facebook%' 
      THEN 'Meta'
    WHEN raw_fonte ILIKE '%scouter%' OR raw_fonte ILIKE '%fichas%'
      THEN 'Scouters'
    WHEN raw_fonte ILIKE '%recep%' 
      THEN 'Recepção'
    WHEN raw_fonte ILIKE '%maxsystem%' 
      THEN 'MaxSystem'
    WHEN raw_fonte ILIKE '%openline%'
      THEN 'OpenLine'
    WHEN raw_fonte IS NULL 
      THEN 'Sem Fonte'
    ELSE raw_fonte
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- FASE 2: Nova RPC get_leads_stats_filtered com filtro de fonte
-- ========================================
CREATE OR REPLACE FUNCTION get_leads_stats_filtered(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS TABLE(total bigint, confirmados bigint, compareceram bigint, pendentes bigint)
LANGUAGE plpgsql
STABLE
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
    (p_start_date IS NULL OR criado >= p_start_date)
    AND (p_end_date IS NULL OR criado <= p_end_date)
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter)
    AND (p_fonte IS NULL OR normalize_fonte(fonte) = p_fonte);
END;
$$;

-- ========================================
-- FASE 3: Nova RPC get_projection_data_filtered com filtro de fonte
-- ========================================
CREATE OR REPLACE FUNCTION get_projection_data_filtered(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_unit_value numeric;
  v_total_value numeric;
BEGIN
  -- Calcular unit_value (preço médio por lead)
  SELECT COALESCE(AVG(valor_ficha), 0) INTO v_unit_value
  FROM leads
  WHERE criado BETWEEN p_start_date AND p_end_date
    AND valor_ficha IS NOT NULL
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter)
    AND (p_fonte IS NULL OR normalize_fonte(fonte) = p_fonte);

  -- Calcular total_value normalizado
  SELECT COUNT(*) * v_unit_value INTO v_total_value
  FROM leads
  WHERE criado BETWEEN p_start_date AND p_end_date
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter)
    AND (p_fonte IS NULL OR normalize_fonte(fonte) = p_fonte);

  -- Construir JSON com todos os dados agregados
  WITH weekday_stats AS (
    SELECT 
      EXTRACT(DOW FROM criado)::int as weekday,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE ficha_confirmada = true) as total_fichas,
      COUNT(DISTINCT DATE(criado)) as days_count
    FROM leads
    WHERE criado BETWEEN p_start_date AND p_end_date
      AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
      AND (p_scouter IS NULL OR scouter = p_scouter)
      AND (p_fonte IS NULL OR normalize_fonte(fonte) = p_fonte)
    GROUP BY EXTRACT(DOW FROM criado)
  ),
  month_part_stats AS (
    SELECT 
      CASE 
        WHEN EXTRACT(DAY FROM criado) <= 10 THEN 'inicio'
        WHEN EXTRACT(DAY FROM criado) <= 20 THEN 'meio'
        ELSE 'fim'
      END as month_part,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE ficha_confirmada = true) as total_fichas,
      COUNT(DISTINCT DATE(criado)) as days_count
    FROM leads
    WHERE criado BETWEEN p_start_date AND p_end_date
      AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
      AND (p_scouter IS NULL OR scouter = p_scouter)
      AND (p_fonte IS NULL OR normalize_fonte(fonte) = p_fonte)
    GROUP BY 
      CASE 
        WHEN EXTRACT(DAY FROM criado) <= 10 THEN 'inicio'
        WHEN EXTRACT(DAY FROM criado) <= 20 THEN 'meio'
        ELSE 'fim'
      END
  ),
  totals AS (
    SELECT 
      COUNT(*)::bigint as total_leads,
      COUNT(*) FILTER (WHERE ficha_confirmada = true)::bigint as total_fichas,
      COUNT(DISTINCT DATE(criado))::bigint as unique_days
    FROM leads
    WHERE criado BETWEEN p_start_date AND p_end_date
      AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
      AND (p_scouter IS NULL OR scouter = p_scouter)
      AND (p_fonte IS NULL OR normalize_fonte(fonte) = p_fonte)
  )
  SELECT jsonb_build_object(
    'weekdayStats', (SELECT jsonb_object_agg(weekday, jsonb_build_object(
      'totalLeads', total_leads,
      'totalFichas', total_fichas,
      'daysCount', days_count
    )) FROM weekday_stats),
    'monthPartStats', (SELECT jsonb_object_agg(month_part, jsonb_build_object(
      'totalLeads', total_leads,
      'totalFichas', total_fichas,
      'daysCount', days_count
    )) FROM month_part_stats),
    'totals', (SELECT jsonb_build_object(
      'totalLeads', total_leads,
      'totalFichas', total_fichas,
      'uniqueDays', unique_days
    ) FROM totals),
    'unitValue', v_unit_value,
    'totalValue', v_total_value
  ) INTO result;

  RETURN result;
END;
$$;