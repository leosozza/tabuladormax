DROP FUNCTION IF EXISTS get_scouter_portal_stats(text, timestamp with time zone, timestamp with time zone, uuid);

CREATE OR REPLACE FUNCTION get_scouter_portal_stats(
  p_scouter_name TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_leads BIGINT,
  com_foto BIGINT,
  confirmados BIGINT,
  agendados BIGINT,
  reagendar BIGINT,
  compareceram BIGINT,
  pendentes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_leads,
    COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '' AND photo_url != '[]')::BIGINT as com_foto,
    COUNT(*) FILTER (WHERE data_confirmacao_ficha IS NOT NULL)::BIGINT as confirmados,
    COUNT(*) FILTER (WHERE data_agendamento IS NOT NULL)::BIGINT as agendados,
    COUNT(*) FILTER (WHERE etapa_funil ILIKE '%reagendar%' OR status_fluxo ILIKE '%reagendar%')::BIGINT as reagendar,
    COUNT(*) FILTER (WHERE compareceu = true)::BIGINT as compareceram,
    COUNT(*) FILTER (WHERE data_confirmacao_ficha IS NULL)::BIGINT as pendentes
  FROM leads
  WHERE scouter = p_scouter_name
    AND (p_start_date IS NULL OR criado >= p_start_date)
    AND (p_end_date IS NULL OR criado <= p_end_date)
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;