-- Função para buscar leads por hora de um scouter em uma data específica
CREATE OR REPLACE FUNCTION public.get_scouter_hourly_leads(
  p_scouter_name TEXT,
  p_date DATE
)
RETURNS TABLE(
  hour INTEGER,
  total_leads BIGINT,
  confirmed_leads BIGINT,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM l.criado)::INTEGER as hour,
    COUNT(*)::BIGINT as total_leads,
    COUNT(*) FILTER (WHERE l.ficha_confirmada = true)::BIGINT as confirmed_leads,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE l.ficha_confirmada = true)::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0
    END as conversion_rate
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND DATE(l.criado) = p_date
  GROUP BY EXTRACT(HOUR FROM l.criado)
  ORDER BY hour;
END;
$function$;