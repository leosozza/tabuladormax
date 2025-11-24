-- Atualizar função get_scouter_performance_detail para usar commercial_project_id
CREATE OR REPLACE FUNCTION public.get_scouter_performance_detail(p_scouter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        jsonb_build_object('project', project_name, 'count', count)
        ORDER BY count DESC
      ), '[]'::JSONB)
      FROM (
        SELECT 
          COALESCE(cp.name, 'Sem Projeto') as project_name,
          COUNT(*) as count
        FROM leads l
        LEFT JOIN commercial_projects cp ON l.commercial_project_id = cp.id
        WHERE l.scouter = scouter_name
        GROUP BY cp.name
        ORDER BY count DESC
        LIMIT 5
      ) sub
    ),
    'timesheet_summary', (
      SELECT jsonb_build_object(
        'total_days_worked', COUNT(*),
        'avg_hours_per_day', ROUND(AVG(hours_worked), 2),
        'total_hours_worked', ROUND(SUM(hours_worked), 2)
      )
      FROM scouter_daily_timesheet
      WHERE scouter = scouter_name
        AND work_date >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO result
  FROM leads
  WHERE scouter = scouter_name;
  
  RETURN COALESCE(result, '{}'::JSONB);
END;
$function$;