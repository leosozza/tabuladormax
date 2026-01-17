-- =====================================================
-- Dropar e recriar RPCs do Portal Scouter para filtrar
-- apenas leads da fonte 'Scouter - Fichas'
-- =====================================================

-- Dropar funções existentes primeiro
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, text, text, text, text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_projects(text);

-- 1. get_scouter_portal_stats
CREATE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name text,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_project_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_date_from timestamp with time zone;
  v_date_to timestamp with time zone;
BEGIN
  IF p_date_from IS NOT NULL AND p_date_from <> '' THEN
    v_date_from := p_date_from::timestamp with time zone;
  END IF;
  
  IF p_date_to IS NOT NULL AND p_date_to <> '' THEN
    v_date_to := (p_date_to::date + interval '1 day' - interval '1 second')::timestamp with time zone;
  END IF;

  WITH base_leads AS (
    SELECT l.id, l.criado, l.compareceu, l.fechou, l.projeto, l.ficha_confirmada
    FROM leads l
    WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
      AND l.fonte = 'Scouter - Fichas'
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
      AND (p_project_code IS NULL OR p_project_code = '' OR l.projeto = p_project_code)
  )
  SELECT jsonb_build_object(
    'total_fichas', COUNT(*),
    'comparecimentos', COUNT(*) FILTER (WHERE compareceu = true),
    'fechamentos', COUNT(*) FILTER (WHERE fechou = true),
    'fichas_pagas', COUNT(*) FILTER (WHERE ficha_confirmada = true)
  ) INTO v_result
  FROM base_leads;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 2. get_scouter_leads_simple (10 params)
CREATE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name text,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_project_code text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sort_field text DEFAULT 'criado',
  p_sort_direction text DEFAULT 'desc',
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_from timestamp with time zone;
  v_date_to timestamp with time zone;
  v_offset integer;
  v_total_count integer;
  v_leads jsonb;
  v_search_pattern text;
BEGIN
  IF p_date_from IS NOT NULL AND p_date_from <> '' THEN
    v_date_from := p_date_from::timestamp with time zone;
  END IF;
  
  IF p_date_to IS NOT NULL AND p_date_to <> '' THEN
    v_date_to := (p_date_to::date + interval '1 day' - interval '1 second')::timestamp with time zone;
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_per_page;
  
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_search_pattern := '%' || lower(trim(p_search)) || '%';
  END IF;

  WITH base_leads AS (
    SELECT l.id, l.bitrix_id, l.nome, l.telefone, l.criado, l.compareceu, l.fechou,
           l.projeto, l.ficha_confirmada, l.data_comparecimento, l.origem, l.fonte
    FROM leads l
    WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
      AND l.fonte = 'Scouter - Fichas'
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
      AND (p_project_code IS NULL OR p_project_code = '' OR l.projeto = p_project_code)
      AND (p_status IS NULL OR p_status = '' OR
           (p_status = 'compareceu' AND l.compareceu = true) OR
           (p_status = 'fechou' AND l.fechou = true) OR
           (p_status = 'ficha_paga' AND l.ficha_confirmada = true) OR
           (p_status = 'pendente' AND (l.compareceu IS NULL OR l.compareceu = false)))
      AND (v_search_pattern IS NULL OR lower(l.nome) LIKE v_search_pattern OR
           l.telefone LIKE v_search_pattern OR l.bitrix_id::text LIKE v_search_pattern)
  ),
  counted AS (SELECT COUNT(*) as total FROM base_leads),
  sorted_leads AS (
    SELECT * FROM base_leads
    ORDER BY
      CASE WHEN p_sort_field = 'criado' AND p_sort_direction = 'desc' THEN criado END DESC NULLS LAST,
      CASE WHEN p_sort_field = 'criado' AND p_sort_direction = 'asc' THEN criado END ASC NULLS LAST,
      CASE WHEN p_sort_field = 'nome' AND p_sort_direction = 'desc' THEN nome END DESC NULLS LAST,
      CASE WHEN p_sort_field = 'nome' AND p_sort_direction = 'asc' THEN nome END ASC NULLS LAST,
      CASE WHEN p_sort_field = 'projeto' AND p_sort_direction = 'desc' THEN projeto END DESC NULLS LAST,
      CASE WHEN p_sort_field = 'projeto' AND p_sort_direction = 'asc' THEN projeto END ASC NULLS LAST,
      criado DESC NULLS LAST
    LIMIT p_per_page OFFSET v_offset
  )
  SELECT (SELECT total FROM counted),
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', sl.id, 'bitrix_id', sl.bitrix_id, 'nome', sl.nome, 'telefone', sl.telefone,
           'criado', sl.criado, 'compareceu', sl.compareceu, 'fechou', sl.fechou,
           'projeto', sl.projeto, 'ficha_confirmada', sl.ficha_confirmada,
           'data_comparecimento', sl.data_comparecimento, 'origem', sl.origem, 'fonte', sl.fonte
         )), '[]'::jsonb)
  INTO v_total_count, v_leads FROM sorted_leads sl;

  RETURN jsonb_build_object('leads', v_leads, 'total', COALESCE(v_total_count, 0),
    'page', p_page, 'per_page', p_per_page,
    'total_pages', CEIL(COALESCE(v_total_count, 0)::numeric / p_per_page));
END;
$$;

-- 3. get_scouter_ranking_position
CREATE FUNCTION public.get_scouter_ranking_position(
  p_scouter_name text,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_date_from timestamp with time zone;
  v_date_to timestamp with time zone;
BEGIN
  IF p_date_from IS NOT NULL AND p_date_from <> '' THEN
    v_date_from := p_date_from::timestamp with time zone;
  END IF;
  
  IF p_date_to IS NOT NULL AND p_date_to <> '' THEN
    v_date_to := (p_date_to::date + interval '1 day' - interval '1 second')::timestamp with time zone;
  END IF;

  WITH scouter_counts AS (
    SELECT lower(trim(l.scouter)) as normalized_scouter, l.scouter as original_name,
           COUNT(*) as total_fichas,
           COUNT(*) FILTER (WHERE l.compareceu = true) as comparecimentos,
           COUNT(*) FILTER (WHERE l.fechou = true) as fechamentos
    FROM leads l
    WHERE l.scouter IS NOT NULL AND l.scouter <> ''
      AND l.fonte = 'Scouter - Fichas'
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
    GROUP BY lower(trim(l.scouter)), l.scouter
  ),
  ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY total_fichas DESC) as position,
           COUNT(*) OVER () as total_scouters
    FROM scouter_counts
  )
  SELECT jsonb_build_object('position', r.position, 'total_scouters', r.total_scouters,
    'total_fichas', r.total_fichas, 'comparecimentos', r.comparecimentos, 'fechamentos', r.fechamentos)
  INTO v_result FROM ranked r WHERE r.normalized_scouter = lower(trim(p_scouter_name));

  RETURN COALESCE(v_result, jsonb_build_object('position', 0, 'total_scouters', 0,
    'total_fichas', 0, 'comparecimentos', 0, 'fechamentos', 0));
END;
$$;

-- 4. get_scouter_projects
CREATE FUNCTION public.get_scouter_projects(p_scouter_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_normalized_scouter text;
BEGIN
  v_normalized_scouter := lower(trim(p_scouter_name));

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('code', cp.code, 'name', cp.name, 'lead_count', sub.lead_count)
    ORDER BY sub.lead_count DESC
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT l.projeto, COUNT(*) as lead_count
    FROM leads l
    WHERE lower(trim(l.scouter)) = v_normalized_scouter
      AND l.fonte = 'Scouter - Fichas'
      AND l.projeto IS NOT NULL AND l.projeto <> ''
    GROUP BY l.projeto
  ) sub
  JOIN commercial_projects cp ON cp.code = sub.projeto AND cp.active = true;

  RETURN v_result;
END;
$$;