CREATE OR REPLACE FUNCTION public.get_general_stats_filtered(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  total_leads bigint, 
  confirmados bigint, 
  compareceram bigint, 
  valor_total numeric, 
  leads_periodo bigint,
  taxa_conversao numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(l.id) as total_leads,
    COUNT(l.id) FILTER (WHERE l.ficha_confirmada = true) as confirmados,
    COUNT(l.id) FILTER (
      WHERE l.etapa IN ('CONVERTED', 'Lead convertido')
        AND l.date_closed IS NOT NULL
    ) as compareceram,
    COALESCE(SUM(l.valor_ficha), 0) as valor_total,
    COUNT(l.id) as leads_periodo,
    CASE 
      WHEN COUNT(l.id) > 0 
      THEN ROUND((COUNT(l.id) FILTER (WHERE l.ficha_confirmada = true)::NUMERIC / COUNT(l.id)) * 100, 2)
      ELSE 0
    END as taxa_conversao
  FROM leads l
  WHERE 
    (p_start_date IS NULL OR l.criado >= p_start_date)
    AND (p_end_date IS NULL OR l.criado <= p_end_date);
END;
$function$;