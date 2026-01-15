CREATE OR REPLACE FUNCTION get_area_comparecidos(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  latitude TEXT,
  longitude TEXT,
  address TEXT,
  local_abordagem TEXT,
  scouter TEXT,
  projeto_comercial TEXT,
  data_compareceu TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_leads AS (
    SELECT 
      l.id,
      l.name,
      l.latitude::TEXT as latitude,
      l.longitude::TEXT as longitude,
      l.address,
      l.local_abordagem,
      l.scouter,
      l.projeto_comercial,
      l.raw->>'UF_CRM_DATACOMPARECEU' as data_compareceu_raw
    FROM leads l
    WHERE l.compareceu = true
      AND l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
      AND (
        p_project_id IS NULL 
        OR l.commercial_project_id = p_project_id::UUID
      )
      AND (
        p_start_date IS NULL 
        OR p_end_date IS NULL
        OR (
          l.raw->>'UF_CRM_DATACOMPARECEU' IS NOT NULL
          AND (l.raw->>'UF_CRM_DATACOMPARECEU')::TIMESTAMPTZ >= p_start_date
          AND (l.raw->>'UF_CRM_DATACOMPARECEU')::TIMESTAMPTZ <= p_end_date
        )
      )
  )
  SELECT 
    fl.id,
    fl.name,
    fl.latitude,
    fl.longitude,
    fl.address,
    fl.local_abordagem,
    fl.scouter,
    fl.projeto_comercial,
    fl.data_compareceu_raw as data_compareceu,
    COUNT(*) OVER() as total_count
  FROM filtered_leads fl;
END;
$$;