-- Atualizar função get_scouter_leads_simple para aceitar filtro por tipo
CREATE OR REPLACE FUNCTION get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  lead_id BIGINT,
  nome_modelo TEXT,
  criado TIMESTAMPTZ,
  address TEXT,
  etapa_lead TEXT,
  celular TEXT,
  commercial_project_id TEXT,
  photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id::BIGINT as lead_id,
    l.nome_modelo::TEXT,
    l.criado,
    COALESCE(NULLIF(TRIM(l.address), ''), NULLIF(TRIM(l.raw->>'UF_CRM_1740503916697'), ''))::TEXT as address,
    l.etapa::TEXT as etapa_lead,
    COALESCE(NULLIF(TRIM(l.celular), ''), NULLIF(TRIM(l.raw->'PHONE'->0->>'VALUE'), ''))::TEXT as celular,
    l.commercial_project_id,
    l.photo_url::TEXT
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    -- Filtros específicos por tipo de card
    AND (
      p_filter_type = 'all'
      OR (p_filter_type = 'com_foto' AND l.photo_url IS NOT NULL AND l.photo_url != '' AND l.photo_url != '[]')
      OR (p_filter_type = 'confirmados' AND l.data_confirmacao_ficha IS NOT NULL)
      OR (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL)
      OR (p_filter_type = 'reagendar' AND (l.etapa_funil ILIKE '%reagendar%' OR l.status_fluxo ILIKE '%reagendar%'))
      OR (p_filter_type = 'compareceram' AND l.compareceu = true)
      OR (p_filter_type = 'pendentes' AND l.data_confirmacao_ficha IS NULL)
    )
  ORDER BY l.criado DESC;
END;
$$;