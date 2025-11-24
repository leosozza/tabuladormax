-- Atualizar função get_scouter_timesheet para incluir projetos
DROP FUNCTION IF EXISTS public.get_scouter_timesheet(text, date, date, integer);

CREATE OR REPLACE FUNCTION public.get_scouter_timesheet(
  p_scouter_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE(
  work_date DATE,
  clock_in TIME,
  clock_out TIME,
  total_leads INTEGER,
  hours_worked NUMERIC,
  projects TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.work_date,
    t.first_lead_time::TIME as clock_in,
    t.last_lead_time::TIME as clock_out,
    t.total_leads::INTEGER,
    ROUND(t.hours_worked::NUMERIC, 2) as hours_worked,
    (
      SELECT string_agg(DISTINCT COALESCE(cp.name, 'Sem Projeto'), ', ' ORDER BY COALESCE(cp.name, 'Sem Projeto'))
      FROM leads l
      LEFT JOIN commercial_projects cp ON l.commercial_project_id = cp.id
      WHERE l.scouter = p_scouter_name
        AND DATE(l.criado) = t.work_date
    ) as projects
  FROM scouter_daily_timesheet t
  WHERE t.scouter = p_scouter_name
    AND (p_start_date IS NULL OR t.work_date >= p_start_date)
    AND (p_end_date IS NULL OR t.work_date <= p_end_date)
  ORDER BY t.work_date DESC
  LIMIT p_limit;
END;
$function$;