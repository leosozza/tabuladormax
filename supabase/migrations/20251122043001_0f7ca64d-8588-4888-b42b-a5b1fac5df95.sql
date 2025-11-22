-- Função otimizada para agregação de dados de projeção no servidor
CREATE OR REPLACE FUNCTION public.get_projection_data(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    AND (p_scouter IS NULL OR scouter = p_scouter);

  -- Calcular total_value normalizado
  SELECT COUNT(*) * v_unit_value INTO v_total_value
  FROM leads
  WHERE criado BETWEEN p_start_date AND p_end_date
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter);

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