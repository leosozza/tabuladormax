-- Drop existing function with all parameter combinations
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, timestamptz, timestamptz, text, text, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, timestamptz, timestamptz, text, text);

-- Recreate with correct DATE type for data_agendamento
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_project_id TEXT DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  lead_id BIGINT,
  nome_modelo TEXT,
  nome_responsavel TEXT,
  criado TIMESTAMPTZ,
  celular TEXT,
  address TEXT,
  photo_url TEXT,
  phone_normalized TEXT,
  ficha_confirmada BOOLEAN,
  data_agendamento DATE,
  etapa_funil TEXT,
  compareceu BOOLEAN,
  projeto_comercial TEXT,
  template_send_count BIGINT,
  template_status TEXT,
  template_error_reason TEXT,
  total_count BIGINT,
  age INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total_count
  FROM leads l
  WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
    AND l.fonte = 'Scouter - Fichas'
    AND l.criado >= p_date_from
    AND l.criado <= p_date_to
    AND (p_project_id IS NULL OR l.projeto_comercial = p_project_id)
    AND (p_search IS NULL OR 
         l.name ILIKE '%' || p_search || '%' OR 
         l.nome_modelo ILIKE '%' || p_search || '%' OR
         l.phone_normalized ILIKE '%' || p_search || '%')
    AND (
      p_filter_type = 'all' OR
      (p_filter_type = 'pendentes' AND COALESCE(l.ficha_confirmada, false) = false AND l.data_confirmacao_ficha IS NULL) OR
      (p_filter_type = 'confirmados' AND (l.ficha_confirmada = true OR l.data_confirmacao_ficha IS NOT NULL)) OR
      (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL) OR
      (p_filter_type = 'reagendar' AND l.etapa = 'Reagendar') OR
      (p_filter_type = 'compareceram' AND l.etapa IN ('CONVERTED', 'Lead convertido'))
    );

  -- Return paginated results with template stats
  RETURN QUERY
  WITH filtered_leads AS (
    SELECT 
      l.id,
      l.nome_modelo,
      l.nome_responsavel_legal,
      l.criado,
      l.celular,
      l.address,
      l.photo_url,
      l.phone_normalized,
      l.ficha_confirmada,
      l.data_agendamento,
      l.etapa_funil,
      CASE WHEN l.etapa IN ('CONVERTED', 'Lead convertido') THEN true ELSE false END AS compareceu,
      l.projeto_comercial,
      l.age
    FROM leads l
    WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
      AND l.fonte = 'Scouter - Fichas'
      AND l.criado >= p_date_from
      AND l.criado <= p_date_to
      AND (p_project_id IS NULL OR l.projeto_comercial = p_project_id)
      AND (p_search IS NULL OR 
           l.name ILIKE '%' || p_search || '%' OR 
           l.nome_modelo ILIKE '%' || p_search || '%' OR
           l.phone_normalized ILIKE '%' || p_search || '%')
      AND (
        p_filter_type = 'all' OR
        (p_filter_type = 'pendentes' AND COALESCE(l.ficha_confirmada, false) = false AND l.data_confirmacao_ficha IS NULL) OR
        (p_filter_type = 'confirmados' AND (l.ficha_confirmada = true OR l.data_confirmacao_ficha IS NOT NULL)) OR
        (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL) OR
        (p_filter_type = 'reagendar' AND l.etapa = 'Reagendar') OR
        (p_filter_type = 'compareceram' AND l.etapa IN ('CONVERTED', 'Lead convertido'))
      )
    ORDER BY 
      CASE WHEN p_sort_order = 'asc' THEN l.criado END ASC,
      CASE WHEN p_sort_order = 'desc' THEN l.criado END DESC
    LIMIT p_limit OFFSET p_offset
  ),
  template_stats AS (
    SELECT 
      w.phone_number,
      COUNT(*) AS send_count,
      (ARRAY_AGG(w.status ORDER BY w.created_at DESC))[1] AS last_status,
      (ARRAY_AGG(w.metadata->'payload'->>'reason' ORDER BY w.created_at DESC))[1] AS last_error
    FROM whatsapp_messages w
    WHERE w.direction = 'outbound' 
      AND w.message_type = 'template'
      AND w.phone_number IN (SELECT fl.phone_normalized FROM filtered_leads fl WHERE fl.phone_normalized IS NOT NULL)
    GROUP BY w.phone_number
  )
  SELECT 
    fl.id AS lead_id,
    fl.nome_modelo::TEXT,
    fl.nome_responsavel_legal::TEXT AS nome_responsavel,
    fl.criado,
    fl.celular::TEXT,
    fl.address::TEXT,
    fl.photo_url::TEXT,
    fl.phone_normalized::TEXT,
    fl.ficha_confirmada,
    fl.data_agendamento,
    fl.etapa_funil::TEXT,
    fl.compareceu,
    fl.projeto_comercial::TEXT,
    COALESCE(ts.send_count, 0)::BIGINT AS template_send_count,
    ts.last_status::TEXT AS template_status,
    ts.last_error::TEXT AS template_error_reason,
    v_total_count AS total_count,
    fl.age
  FROM filtered_leads fl
  LEFT JOIN template_stats ts ON ts.phone_number = fl.phone_normalized;
END;
$$;