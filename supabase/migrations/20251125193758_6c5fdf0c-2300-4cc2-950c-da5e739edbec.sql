-- Função para retornar etapas normalizadas distintas
CREATE OR REPLACE FUNCTION public.get_normalized_etapas()
RETURNS TABLE(etapa_original text, etapa_normalized text) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    l.etapa as etapa_original,
    normalize_etapa(l.etapa) as etapa_normalized
  FROM leads l
  WHERE l.etapa IS NOT NULL
  ORDER BY normalize_etapa(l.etapa);
END;
$$;