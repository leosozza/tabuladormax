CREATE OR REPLACE FUNCTION public.get_activity_chart_data(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_granularity TEXT DEFAULT 'day'
)
RETURNS TABLE (
  period TEXT,
  total BIGINT,
  scouter BIGINT,
  meta BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_granularity = 'hour' THEN
    RETURN QUERY
    SELECT 
      TO_CHAR(DATE_TRUNC('hour', criado), 'HH24') as period,
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE fonte_normalizada = 'Scouter - Fichas')::BIGINT as scouter,
      COUNT(*) FILTER (WHERE fonte_normalizada = 'Meta')::BIGINT as meta
    FROM leads
    WHERE criado >= p_start_date 
      AND criado <= p_end_date
    GROUP BY DATE_TRUNC('hour', criado)
    ORDER BY DATE_TRUNC('hour', criado);
  ELSE
    RETURN QUERY
    SELECT 
      TO_CHAR(DATE_TRUNC('day', criado), 'YYYY-MM-DD') as period,
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE fonte_normalizada = 'Scouter - Fichas')::BIGINT as scouter,
      COUNT(*) FILTER (WHERE fonte_normalizada = 'Meta')::BIGINT as meta
    FROM leads
    WHERE criado >= p_start_date 
      AND criado <= p_end_date
    GROUP BY DATE_TRUNC('day', criado)
    ORDER BY DATE_TRUNC('day', criado);
  END IF;
END;
$$;