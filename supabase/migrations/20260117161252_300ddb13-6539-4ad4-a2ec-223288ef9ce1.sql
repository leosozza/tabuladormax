-- Drop existing functions to recreate them with correct column names
DROP FUNCTION IF EXISTS public.get_scouter_projects(text);
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, timestamptz, timestamptz);

-- Recreate get_scouter_projects with correct column (projeto_comercial instead of projeto)
CREATE OR REPLACE FUNCTION public.get_scouter_projects(p_scouter_name text)
RETURNS TABLE (
  project_code text,
  lead_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.projeto_comercial AS project_code,
    COUNT(*)::bigint AS lead_count
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND l.projeto_comercial IS NOT NULL 
    AND l.projeto_comercial <> ''
    AND l.source_description = 'Scouter - Fichas'
  GROUP BY l.projeto_comercial
  ORDER BY lead_count DESC;
END;
$$;

-- Recreate get_scouter_portal_stats with correct columns
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_leads,
    COUNT(*) FILTER (WHERE l.foto_modelo IS NOT NULL AND l.foto_modelo <> '')::bigint AS com_foto,
    COUNT(*) FILTER (WHERE l.ficha_confirmada = true)::bigint AS confirmados,
    COUNT(*) FILTER (WHERE l.status_tabulacao IN ('Agendado', 'Agendado-Confirmado', 'Agendado-WhatsApp'))::bigint AS agendados,
    COUNT(*) FILTER (WHERE l.status_tabulacao = 'Reagendar')::bigint AS reagendar,
    COUNT(*) FILTER (WHERE l.status_tabulacao = 'Compareceu')::bigint AS compareceram,
    COUNT(*) FILTER (WHERE l.status_tabulacao IS NULL OR l.status_tabulacao = '' OR l.status_tabulacao = 'Pendente')::bigint AS pendentes,
    COUNT(*) FILTER (WHERE l.e_duplicado = true)::bigint AS duplicados
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND l.source_description = 'Scouter - Fichas'
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_code IS NULL OR l.projeto_comercial = p_project_code);
END;
$$;

-- Recreate get_scouter_ranking_position with correct columns (using date_closed instead of fechou)
CREATE OR REPLACE FUNCTION public.get_scouter_ranking_position(
  p_scouter_name text,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  rank_position bigint,
  total_leads bigint,
  scouter_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH scouter_counts AS (
    SELECT 
      l.scouter AS scouter_name,
      COUNT(*)::bigint AS total_leads
    FROM leads l
    WHERE l.scouter IS NOT NULL 
      AND l.scouter <> ''
      AND l.source_description = 'Scouter - Fichas'
      AND (p_date_from IS NULL OR l.criado >= p_date_from)
      AND (p_date_to IS NULL OR l.criado <= p_date_to)
    GROUP BY l.scouter
  ),
  ranked AS (
    SELECT 
      sc.scouter_name,
      sc.total_leads,
      ROW_NUMBER() OVER (ORDER BY sc.total_leads DESC)::bigint AS rank_position
    FROM scouter_counts sc
  )
  SELECT r.rank_position, r.total_leads, r.scouter_name
  FROM ranked r
  WHERE r.scouter_name = p_scouter_name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_scouter_projects(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_scouter_portal_stats(text, timestamptz, timestamptz, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_scouter_ranking_position(text, timestamptz, timestamptz) TO authenticated, anon;