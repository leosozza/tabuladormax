-- Create functional indexes for normalized scouter comparison
CREATE INDEX IF NOT EXISTS idx_leads_scouter_normalized 
ON leads ((lower(trim(scouter)))) 
WHERE scouter IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_scouter_normalized_criado 
ON leads ((lower(trim(scouter))), criado DESC) 
WHERE scouter IS NOT NULL;

-- Update get_scouter_portal_stats to use normalized comparison
CREATE OR REPLACE FUNCTION get_scouter_portal_stats(
  p_scouter_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_start DATE;
  v_end DATE;
  v_normalized_scouter TEXT;
BEGIN
  v_start := COALESCE(p_start_date, CURRENT_DATE);
  v_end := COALESCE(p_end_date, CURRENT_DATE);
  v_normalized_scouter := lower(trim(p_scouter_name));
  
  SELECT json_build_object(
    'total_leads', COUNT(*),
    'com_foto', COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '' AND photo_url != '[]'),
    'confirmados', COUNT(*) FILTER (WHERE data_confirmacao_ficha IS NOT NULL),
    'agendados', COUNT(*) FILTER (WHERE data_agendamento IS NOT NULL),
    'compareceram', COUNT(*) FILTER (WHERE compareceu = true),
    'pendentes', COUNT(*) FILTER (WHERE data_confirmacao_ficha IS NULL),
    'reagendar', COUNT(*) FILTER (WHERE 
      lower(etapa_funil) LIKE '%reagendar%' OR 
      lower(status_fluxo) LIKE '%reagendar%'
    )
  ) INTO result
  FROM leads l
  WHERE lower(trim(l.scouter)) = v_normalized_scouter
    AND l.criado::date BETWEEN v_start AND v_end
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id::UUID);
  
  RETURN result;
END;
$$;

-- Update get_scouter_projects to use normalized comparison
CREATE OR REPLACE FUNCTION get_scouter_projects(
  p_scouter_name TEXT
)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  project_code TEXT,
  lead_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_scouter TEXT;
BEGIN
  v_normalized_scouter := lower(trim(p_scouter_name));
  
  RETURN QUERY
  SELECT 
    cp.id as project_id,
    cp.name as project_name,
    cp.code as project_code,
    COUNT(l.id) as lead_count
  FROM commercial_projects cp
  INNER JOIN leads l ON l.commercial_project_id = cp.id
  WHERE lower(trim(l.scouter)) = v_normalized_scouter
    AND cp.active = true
  GROUP BY cp.id, cp.name, cp.code
  ORDER BY lead_count DESC;
END;
$$;

-- Update get_scouter_ranking_position to use normalized comparison
CREATE OR REPLACE FUNCTION get_scouter_ranking_position(
  p_scouter_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_start DATE;
  v_end DATE;
  v_normalized_scouter TEXT;
BEGIN
  v_start := COALESCE(p_start_date, CURRENT_DATE);
  v_end := COALESCE(p_end_date, CURRENT_DATE);
  v_normalized_scouter := lower(trim(p_scouter_name));
  
  WITH scouter_stats AS (
    SELECT 
      lower(trim(l.scouter)) as normalized_scouter,
      l.scouter as original_scouter,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE l.compareceu = true) as compareceram
    FROM leads l
    WHERE l.scouter IS NOT NULL
      AND l.criado::date BETWEEN v_start AND v_end
      AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id::UUID)
    GROUP BY lower(trim(l.scouter)), l.scouter
  ),
  ranked AS (
    SELECT 
      normalized_scouter,
      original_scouter,
      total_leads,
      compareceram,
      ROW_NUMBER() OVER (ORDER BY total_leads DESC) as position
    FROM scouter_stats
  )
  SELECT json_build_object(
    'position', COALESCE((SELECT position FROM ranked WHERE normalized_scouter = v_normalized_scouter), 0),
    'total_scouters', (SELECT COUNT(*) FROM ranked),
    'my_leads', COALESCE((SELECT total_leads FROM ranked WHERE normalized_scouter = v_normalized_scouter), 0),
    'my_compareceram', COALESCE((SELECT compareceram FROM ranked WHERE normalized_scouter = v_normalized_scouter), 0),
    'top_3', (
      SELECT json_agg(json_build_object(
        'scouter', original_scouter,
        'total_leads', total_leads,
        'compareceram', compareceram,
        'position', position
      ) ORDER BY position)
      FROM ranked
      WHERE position <= 3
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Update get_scouter_leads_simple to use normalized comparison
CREATE OR REPLACE FUNCTION get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_filter_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_sort_field TEXT DEFAULT 'criado',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_start DATE;
  v_end DATE;
  v_normalized_scouter TEXT;
  v_search_pattern TEXT;
BEGIN
  v_start := COALESCE(p_start_date, CURRENT_DATE);
  v_end := COALESCE(p_end_date, CURRENT_DATE);
  v_normalized_scouter := lower(trim(p_scouter_name));
  v_search_pattern := CASE WHEN p_search IS NOT NULL AND p_search != '' 
    THEN '%' || lower(p_search) || '%' 
    ELSE NULL 
  END;
  
  WITH filtered_leads AS (
    SELECT 
      l.id,
      l.nome_modelo,
      l.nome_responsavel,
      l.telefone,
      l.photo_url,
      l.criado,
      l.data_confirmacao_ficha,
      l.data_agendamento,
      l.compareceu,
      l.etapa_funil,
      l.status_fluxo,
      l.cidade,
      l.estado,
      l.projeto,
      l.scouter,
      l.template_status,
      l.template_error,
      l.template_sent_at,
      l.template_send_count,
      l.phone_normalized
    FROM leads l
    WHERE lower(trim(l.scouter)) = v_normalized_scouter
      AND l.criado::date BETWEEN v_start AND v_end
      AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id::UUID)
      AND (v_search_pattern IS NULL OR (
        lower(COALESCE(l.nome_modelo, '')) LIKE v_search_pattern OR
        lower(COALESCE(l.nome_responsavel, '')) LIKE v_search_pattern OR
        l.id::text LIKE v_search_pattern
      ))
      AND (
        p_filter_type IS NULL
        OR (p_filter_type = 'com_foto' AND l.photo_url IS NOT NULL AND l.photo_url != '' AND l.photo_url != '[]')
        OR (p_filter_type = 'confirmados' AND l.data_confirmacao_ficha IS NOT NULL)
        OR (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL)
        OR (p_filter_type = 'reagendar' AND (
          lower(l.etapa_funil) LIKE '%reagendar%' OR 
          lower(l.status_fluxo) LIKE '%reagendar%'
        ))
        OR (p_filter_type = 'compareceram' AND l.compareceu = true)
        OR (p_filter_type = 'pendentes' AND l.data_confirmacao_ficha IS NULL)
        OR (p_filter_type = 'duplicados' AND EXISTS (
          SELECT 1 FROM leads l2 
          WHERE l2.phone_normalized = l.phone_normalized 
            AND l2.id != l.id
            AND l2.criado >= l.criado - INTERVAL '60 days'
            AND l2.criado <= l.criado + INTERVAL '60 days'
        ))
      )
  ),
  total_count AS (
    SELECT COUNT(*) as cnt FROM filtered_leads
  ),
  sorted_leads AS (
    SELECT * FROM filtered_leads
    ORDER BY
      CASE WHEN p_sort_field = 'criado' AND p_sort_order = 'desc' THEN criado END DESC NULLS LAST,
      CASE WHEN p_sort_field = 'criado' AND p_sort_order = 'asc' THEN criado END ASC NULLS LAST,
      CASE WHEN p_sort_field = 'nome_modelo' AND p_sort_order = 'asc' THEN nome_modelo END ASC NULLS LAST,
      CASE WHEN p_sort_field = 'nome_modelo' AND p_sort_order = 'desc' THEN nome_modelo END DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset
  )
  SELECT json_build_object(
    'total', (SELECT cnt FROM total_count),
    'leads', COALESCE((
      SELECT json_agg(json_build_object(
        'id', id,
        'nome_modelo', nome_modelo,
        'nome_responsavel', nome_responsavel,
        'telefone', telefone,
        'photo_url', photo_url,
        'criado', criado,
        'data_confirmacao_ficha', data_confirmacao_ficha,
        'data_agendamento', data_agendamento,
        'compareceu', compareceu,
        'etapa_funil', etapa_funil,
        'status_fluxo', status_fluxo,
        'cidade', cidade,
        'estado', estado,
        'projeto', projeto,
        'scouter', scouter,
        'template_status', template_status,
        'template_error', template_error,
        'template_sent_at', template_sent_at,
        'template_send_count', template_send_count,
        'phone_normalized', phone_normalized
      ))
      FROM sorted_leads
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$;