-- =====================================================
-- PARTE 1: DROPAR TODAS AS VERSÕES DUPLICADAS
-- =====================================================

-- get_scouter_portal_stats (todas as versões)
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, date, date, text);
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, timestamptz, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, text, text, text);

-- get_scouter_ranking_position (todas as versões)
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, date, date, text);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, text, text);

-- get_scouter_leads_simple (todas as versões)
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, timestamptz, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, date, date, text, text, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, timestamptz, timestamptz, text, text, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, text, text, text, text, integer, integer, text, text, text);

-- get_scouter_timesheet (também tem versões duplicadas)
DROP FUNCTION IF EXISTS public.get_scouter_timesheet(text, date, date, integer);
DROP FUNCTION IF EXISTS public.get_scouter_timesheet(text, timestamptz, timestamptz, integer);
DROP FUNCTION IF EXISTS public.get_scouter_timesheet(text, text, text, integer);

-- =====================================================
-- PARTE 2: RECRIAR FUNÇÕES COM ASSINATURA ÚNICA
-- =====================================================

-- =====================================================
-- get_scouter_portal_stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_leads BIGINT,
  com_foto BIGINT,
  confirmados BIGINT,
  agendados BIGINT,
  reagendar BIGINT,
  compareceram BIGINT,
  pendentes BIGINT,
  duplicados BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_scouter TEXT;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  -- Normalizar nome do scouter
  v_normalized_scouter := lower(trim(p_scouter_name));
  
  -- Converter datas
  v_date_from := CASE WHEN p_date_from IS NOT NULL AND p_date_from != '' THEN p_date_from::TIMESTAMPTZ ELSE NULL END;
  v_date_to := CASE WHEN p_date_to IS NOT NULL AND p_date_to != '' THEN p_date_to::TIMESTAMPTZ ELSE NULL END;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_leads,
    COUNT(*) FILTER (WHERE l.tem_foto = true)::BIGINT AS com_foto,
    COUNT(*) FILTER (WHERE l.ficha_confirmada = true)::BIGINT AS confirmados,
    COUNT(*) FILTER (WHERE l.data_agendamento IS NOT NULL)::BIGINT AS agendados,
    COUNT(*) FILTER (WHERE l.resultado_ligacao = 'Reagendar')::BIGINT AS reagendar,
    COUNT(*) FILTER (WHERE l.compareceu = true)::BIGINT AS compareceram,
    COUNT(*) FILTER (WHERE l.ficha_confirmada IS NOT TRUE AND l.status_contato IS NULL)::BIGINT AS pendentes,
    COUNT(*) FILTER (WHERE l.duplicado = true)::BIGINT AS duplicados
  FROM leads l
  WHERE lower(trim(l.scouter)) = v_normalized_scouter
    AND (v_date_from IS NULL OR l.criado >= v_date_from)
    AND (v_date_to IS NULL OR l.criado <= v_date_to)
    AND (p_project_id IS NULL OR p_project_id = '' OR l.projeto = p_project_id);
END;
$$;

-- =====================================================
-- get_scouter_ranking_position
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_ranking_position(
  p_scouter_name TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL
)
RETURNS TABLE (
  "position" INTEGER,
  total_leads BIGINT,
  scouter_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_scouter TEXT;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  -- Normalizar nome do scouter
  v_normalized_scouter := lower(trim(p_scouter_name));
  
  -- Converter datas
  v_date_from := CASE WHEN p_date_from IS NOT NULL AND p_date_from != '' THEN p_date_from::TIMESTAMPTZ ELSE NULL END;
  v_date_to := CASE WHEN p_date_to IS NOT NULL AND p_date_to != '' THEN p_date_to::TIMESTAMPTZ ELSE NULL END;

  RETURN QUERY
  WITH scouter_counts AS (
    SELECT 
      l.scouter AS scouter_raw,
      COUNT(*) AS lead_count
    FROM leads l
    WHERE l.scouter IS NOT NULL
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
    GROUP BY l.scouter
  ),
  ranked AS (
    SELECT 
      sc.scouter_raw,
      sc.lead_count,
      ROW_NUMBER() OVER (ORDER BY sc.lead_count DESC) AS rank_pos
    FROM scouter_counts sc
  )
  SELECT 
    r.rank_pos::INTEGER AS "position",
    r.lead_count::BIGINT AS total_leads,
    r.scouter_raw::TEXT AS scouter_name
  FROM ranked r
  WHERE lower(trim(r.scouter_raw)) = v_normalized_scouter
  LIMIT 1;
END;
$$;

-- =====================================================
-- get_scouter_leads_simple
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'criado',
  p_sort_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id INTEGER,
  nome TEXT,
  telefone TEXT,
  projeto TEXT,
  criado TIMESTAMPTZ,
  tem_foto BOOLEAN,
  ficha_confirmada BOOLEAN,
  data_agendamento TIMESTAMPTZ,
  compareceu BOOLEAN,
  resultado_ligacao TEXT,
  status_contato TEXT,
  duplicado BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_scouter TEXT;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
  v_total BIGINT;
BEGIN
  -- Normalizar nome do scouter
  v_normalized_scouter := lower(trim(p_scouter_name));
  
  -- Converter datas
  v_date_from := CASE WHEN p_date_from IS NOT NULL AND p_date_from != '' THEN p_date_from::TIMESTAMPTZ ELSE NULL END;
  v_date_to := CASE WHEN p_date_to IS NOT NULL AND p_date_to != '' THEN p_date_to::TIMESTAMPTZ ELSE NULL END;

  -- Contar total
  SELECT COUNT(*)::BIGINT INTO v_total
  FROM leads l
  WHERE lower(trim(l.scouter)) = v_normalized_scouter
    AND (v_date_from IS NULL OR l.criado >= v_date_from)
    AND (v_date_to IS NULL OR l.criado <= v_date_to)
    AND (p_project_id IS NULL OR p_project_id = '' OR l.projeto = p_project_id)
    AND (p_search IS NULL OR p_search = '' OR 
         l.nome ILIKE '%' || p_search || '%' OR 
         l.telefone ILIKE '%' || p_search || '%')
    AND (
      p_filter_type = 'all' OR
      (p_filter_type = 'com_foto' AND l.tem_foto = true) OR
      (p_filter_type = 'confirmados' AND l.ficha_confirmada = true) OR
      (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL) OR
      (p_filter_type = 'compareceram' AND l.compareceu = true) OR
      (p_filter_type = 'pendentes' AND l.ficha_confirmada IS NOT TRUE AND l.status_contato IS NULL) OR
      (p_filter_type = 'duplicados' AND l.duplicado = true) OR
      (p_filter_type = 'reagendar' AND l.resultado_ligacao = 'Reagendar')
    );

  RETURN QUERY
  SELECT 
    l.id::INTEGER,
    l.nome::TEXT,
    l.telefone::TEXT,
    l.projeto::TEXT,
    l.criado::TIMESTAMPTZ,
    l.tem_foto::BOOLEAN,
    l.ficha_confirmada::BOOLEAN,
    l.data_agendamento::TIMESTAMPTZ,
    l.compareceu::BOOLEAN,
    l.resultado_ligacao::TEXT,
    l.status_contato::TEXT,
    l.duplicado::BOOLEAN,
    v_total AS total_count
  FROM leads l
  WHERE lower(trim(l.scouter)) = v_normalized_scouter
    AND (v_date_from IS NULL OR l.criado >= v_date_from)
    AND (v_date_to IS NULL OR l.criado <= v_date_to)
    AND (p_project_id IS NULL OR p_project_id = '' OR l.projeto = p_project_id)
    AND (p_search IS NULL OR p_search = '' OR 
         l.nome ILIKE '%' || p_search || '%' OR 
         l.telefone ILIKE '%' || p_search || '%')
    AND (
      p_filter_type = 'all' OR
      (p_filter_type = 'com_foto' AND l.tem_foto = true) OR
      (p_filter_type = 'confirmados' AND l.ficha_confirmada = true) OR
      (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL) OR
      (p_filter_type = 'compareceram' AND l.compareceu = true) OR
      (p_filter_type = 'pendentes' AND l.ficha_confirmada IS NOT TRUE AND l.status_contato IS NULL) OR
      (p_filter_type = 'duplicados' AND l.duplicado = true) OR
      (p_filter_type = 'reagendar' AND l.resultado_ligacao = 'Reagendar')
    )
  ORDER BY 
    CASE WHEN p_sort_direction = 'asc' THEN
      CASE p_sort_column
        WHEN 'criado' THEN l.criado::TEXT
        WHEN 'nome' THEN l.nome
        ELSE l.criado::TEXT
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_direction = 'desc' OR p_sort_direction IS NULL THEN
      CASE p_sort_column
        WHEN 'criado' THEN l.criado::TEXT
        WHEN 'nome' THEN l.nome
        ELSE l.criado::TEXT
      END
    END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- get_scouter_timesheet
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_timesheet(
  p_scouter_name TEXT,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  work_date DATE,
  clock_in TIME,
  clock_out TIME,
  total_leads BIGINT,
  hours_worked NUMERIC,
  projects TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_scouter TEXT;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Normalizar nome do scouter
  v_normalized_scouter := lower(trim(p_scouter_name));
  
  -- Converter datas
  v_start_date := CASE WHEN p_start_date IS NOT NULL AND p_start_date != '' THEN p_start_date::DATE ELSE NULL END;
  v_end_date := CASE WHEN p_end_date IS NOT NULL AND p_end_date != '' THEN p_end_date::DATE ELSE NULL END;

  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      l.criado::DATE AS dia,
      MIN(l.criado::TIME) AS primeiro_lead,
      MAX(l.criado::TIME) AS ultimo_lead,
      COUNT(*) AS leads_count,
      STRING_AGG(DISTINCT l.projeto, ', ') AS projetos
    FROM leads l
    WHERE lower(trim(l.scouter)) = v_normalized_scouter
      AND (v_start_date IS NULL OR l.criado::DATE >= v_start_date)
      AND (v_end_date IS NULL OR l.criado::DATE <= v_end_date)
    GROUP BY l.criado::DATE
    ORDER BY l.criado::DATE DESC
    LIMIT p_limit
  )
  SELECT 
    ds.dia AS work_date,
    ds.primeiro_lead AS clock_in,
    ds.ultimo_lead AS clock_out,
    ds.leads_count::BIGINT AS total_leads,
    ROUND(EXTRACT(EPOCH FROM (ds.ultimo_lead - ds.primeiro_lead)) / 3600.0, 2)::NUMERIC AS hours_worked,
    ds.projetos::TEXT AS projects
  FROM daily_stats ds;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_scouter_portal_stats(TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_scouter_ranking_position(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_scouter_leads_simple(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_scouter_timesheet(TEXT, TEXT, TEXT, INTEGER) TO authenticated, anon;