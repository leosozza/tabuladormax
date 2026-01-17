-- Remover versões específicas das funções duplicadas
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_scouter_projects(text);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, timestamptz, timestamptz);

-- Recriar get_scouter_projects com coluna correta (fonte)
CREATE OR REPLACE FUNCTION public.get_scouter_projects(p_scouter_name text)
RETURNS TABLE (project_code text, lead_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT l.projeto_comercial, COUNT(*)::bigint
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND l.projeto_comercial IS NOT NULL 
    AND l.projeto_comercial <> ''
    AND l.fonte = 'Scouter - Fichas'
  GROUP BY l.projeto_comercial
  ORDER BY COUNT(*) DESC;
END;
$$;

-- Recriar get_scouter_portal_stats com coluna correta
CREATE OR REPLACE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name text,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_project_code text DEFAULT NULL
)
RETURNS TABLE (
  total_leads bigint, com_foto bigint, confirmados bigint,
  agendados bigint, reagendar bigint, compareceram bigint,
  pendentes bigint, duplicados bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE l.photo_url IS NOT NULL AND l.photo_url <> '')::bigint,
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

-- Recriar get_scouter_ranking_position com coluna correta
CREATE OR REPLACE FUNCTION public.get_scouter_ranking_position(
  p_scouter_name text,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (rank_position bigint, total_leads bigint, scouter_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH scouter_counts AS (
    SELECT l.scouter, COUNT(*)::bigint AS total_leads
    FROM leads l
    WHERE l.scouter IS NOT NULL AND l.scouter <> ''
      AND l.fonte = 'Scouter - Fichas'
      AND (p_date_from IS NULL OR l.criado >= p_date_from)
      AND (p_date_to IS NULL OR l.criado <= p_date_to)
    GROUP BY l.scouter
  ),
  ranked AS (
    SELECT sc.scouter, sc.total_leads,
           ROW_NUMBER() OVER (ORDER BY sc.total_leads DESC)::bigint AS rank_position
    FROM scouter_counts sc
  )
  SELECT r.rank_position, r.total_leads, r.scouter
  FROM ranked r WHERE r.scouter = p_scouter_name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_scouter_projects(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_scouter_portal_stats(text, timestamptz, timestamptz, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_scouter_ranking_position(text, timestamptz, timestamptz) TO authenticated, anon;