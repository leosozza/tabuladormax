DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name text,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_project_code text DEFAULT NULL
)
RETURNS TABLE (
  total_leads bigint, 
  com_foto bigint, 
  confirmados bigint,
  agendados bigint, 
  reagendar bigint, 
  compareceram bigint,
  pendentes bigint, 
  duplicados bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE 
      l.photo_url IS NOT NULL 
      AND l.photo_url <> '' 
      AND l.photo_url <> '[]'
    )::bigint,
    COUNT(*) FILTER (WHERE l.ficha_confirmada = true)::bigint,
    COUNT(*) FILTER (WHERE l.status_tabulacao IN ('Agendado', 'Agendado-Confirmado', 'Agendado-WhatsApp'))::bigint,
    COUNT(*) FILTER (WHERE l.status_tabulacao = 'Reagendar')::bigint,
    COUNT(*) FILTER (WHERE l.status_tabulacao = 'Compareceu')::bigint,
    COUNT(*) FILTER (WHERE l.status_tabulacao IS NULL OR l.status_tabulacao = '' OR l.status_tabulacao = 'Pendente')::bigint,
    0::bigint
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND l.fonte = 'Scouter - Fichas'
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_code IS NULL OR l.projeto_comercial = p_project_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scouter_portal_stats(text, timestamptz, timestamptz, text) TO authenticated, anon;