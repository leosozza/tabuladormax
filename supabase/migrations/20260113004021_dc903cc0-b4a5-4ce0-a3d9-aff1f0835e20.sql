-- =====================================================
-- Atualizar get_scouter_leads_simple para retornar campos completos
-- compatíveis com o frontend existente
-- =====================================================

-- Dropar função existente
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, text, text, text, text, integer, integer, text, text, text);

-- Recriar com todos os campos necessários para o frontend
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
  lead_id INTEGER,
  nome_modelo TEXT,
  nome_responsavel TEXT,
  criado TIMESTAMPTZ,
  celular TEXT,
  address TEXT,
  photo_url TEXT,
  phone_normalized TEXT,
  ficha_confirmada BOOLEAN,
  template_status TEXT,
  template_error_reason TEXT,
  template_send_count INTEGER,
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
    l.id::INTEGER AS lead_id,
    l.nome::TEXT AS nome_modelo,
    l.nome_responsavel::TEXT AS nome_responsavel,
    l.criado::TIMESTAMPTZ AS criado,
    l.telefone::TEXT AS celular,
    l.endereco_completo::TEXT AS address,
    l.foto::TEXT AS photo_url,
    l.telefone_normalizado::TEXT AS phone_normalized,
    l.ficha_confirmada::BOOLEAN AS ficha_confirmada,
    l.template_status::TEXT AS template_status,
    l.template_error_reason::TEXT AS template_error_reason,
    COALESCE(l.template_send_count, 0)::INTEGER AS template_send_count,
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

-- Grant
GRANT EXECUTE ON FUNCTION public.get_scouter_leads_simple(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT) TO authenticated, anon;