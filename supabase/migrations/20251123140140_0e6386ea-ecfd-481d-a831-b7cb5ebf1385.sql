-- Criar view materializada para controle de ponto
CREATE MATERIALIZED VIEW scouter_daily_timesheet AS
SELECT 
  scouter,
  DATE(criado) as work_date,
  MIN(criado) as first_lead_time,
  MAX(criado) as last_lead_time,
  COUNT(*) as total_leads,
  EXTRACT(EPOCH FROM (MAX(criado) - MIN(criado))) / 3600 as hours_worked
FROM leads
WHERE scouter IS NOT NULL
GROUP BY scouter, DATE(criado)
ORDER BY scouter, work_date DESC;

-- Criar índices para performance
CREATE INDEX idx_timesheet_scouter ON scouter_daily_timesheet(scouter);
CREATE INDEX idx_timesheet_date ON scouter_daily_timesheet(work_date);

-- Função para buscar dados de ponto de um scouter
CREATE OR REPLACE FUNCTION get_scouter_timesheet(
  p_scouter_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INT DEFAULT 30
)
RETURNS TABLE(
  work_date DATE,
  clock_in TIME,
  clock_out TIME,
  total_leads INTEGER,
  hours_worked NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.work_date,
    t.first_lead_time::TIME as clock_in,
    t.last_lead_time::TIME as clock_out,
    t.total_leads::INTEGER,
    ROUND(t.hours_worked::NUMERIC, 2) as hours_worked
  FROM scouter_daily_timesheet t
  WHERE t.scouter = p_scouter_name
    AND (p_start_date IS NULL OR t.work_date >= p_start_date)
    AND (p_end_date IS NULL OR t.work_date <= p_end_date)
  ORDER BY t.work_date DESC
  LIMIT p_limit;
END;
$$;

-- Modificar get_scouter_performance_detail para incluir resumo de ponto
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
$$;

-- Função para refresh automático throttled (1x por minuto)
CREATE OR REPLACE FUNCTION throttled_refresh_timesheet()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  last_refresh TIMESTAMP;
BEGIN
  -- Buscar última atualização
  SELECT value::TEXT::TIMESTAMP INTO last_refresh
  FROM config_kv
  WHERE key = 'timesheet_last_refresh';
  
  -- Refresh apenas se passou mais de 1 minuto
  IF last_refresh IS NULL OR (NOW() - last_refresh) > INTERVAL '1 minute' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY scouter_daily_timesheet;
    
    INSERT INTO config_kv (key, value)
    VALUES ('timesheet_last_refresh', to_jsonb(NOW()::TEXT))
    ON CONFLICT (key) DO UPDATE SET value = to_jsonb(NOW()::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar view automaticamente
CREATE TRIGGER leads_timesheet_refresh
AFTER INSERT OR UPDATE ON leads
FOR EACH STATEMENT
EXECUTE FUNCTION throttled_refresh_timesheet();