-- Corrigir search_path da função get_scouter_performance_detail
DROP FUNCTION IF EXISTS get_scouter_performance_detail(UUID);

CREATE OR REPLACE FUNCTION get_scouter_performance_detail(p_scouter_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  scouter_name TEXT;
BEGIN
  -- Buscar nome do scouter
  SELECT name INTO scouter_name FROM scouters WHERE id = p_scouter_id;
  
  IF scouter_name IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;
  
  SELECT jsonb_build_object(
    'total_leads', COUNT(*),
    'confirmed_leads', COUNT(*) FILTER (WHERE ficha_confirmada = true),
    'attended_leads', COUNT(*) FILTER (WHERE compareceu = true),
    'total_value', COALESCE(SUM(valor_ficha), 0),
    'conversion_rate', 
      CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE ficha_confirmada = true)::NUMERIC / COUNT(*)) * 100, 2)
        ELSE 0
      END,
    'leads_by_month', (
      SELECT COALESCE(jsonb_object_agg(month_str, count), '{}'::JSONB)
      FROM (
        SELECT 
          TO_CHAR(criado, 'YYYY-MM') as month_str,
          COUNT(*) as count
        FROM leads
        WHERE scouter = scouter_name
          AND criado >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(criado, 'YYYY-MM')
        ORDER BY month_str DESC
      ) sub
    ),
    'top_projects', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('project', projeto_comercial, 'count', count)
        ORDER BY count DESC
      ), '[]'::JSONB)
      FROM (
        SELECT projeto_comercial, COUNT(*) as count
        FROM leads
        WHERE scouter = scouter_name
          AND projeto_comercial IS NOT NULL
        GROUP BY projeto_comercial
        ORDER BY count DESC
        LIMIT 5
      ) sub
    )
  ) INTO result
  FROM leads
  WHERE scouter = scouter_name;
  
  RETURN COALESCE(result, '{}'::JSONB);
END;
$$;