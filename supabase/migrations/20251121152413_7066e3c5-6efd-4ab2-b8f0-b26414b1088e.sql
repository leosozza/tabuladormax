-- Create RPC function to get general statistics
CREATE OR REPLACE FUNCTION get_general_stats()
RETURNS TABLE (
  total_leads BIGINT,
  confirmados BIGINT,
  compareceram BIGINT,
  valor_total NUMERIC,
  leads_hoje BIGINT,
  leads_semana BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(l.id) as total_leads,
    COUNT(l.id) FILTER (WHERE l.ficha_confirmada = true) as confirmados,
    COUNT(l.id) FILTER (WHERE l.compareceu = true) as compareceram,
    COALESCE(SUM(l.valor_ficha), 0) as valor_total,
    COUNT(l.id) FILTER (WHERE l.criado::date = CURRENT_DATE) as leads_hoje,
    COUNT(l.id) FILTER (WHERE l.criado::date >= CURRENT_DATE - INTERVAL '7 days') as leads_semana
  FROM leads l;
END;
$$;