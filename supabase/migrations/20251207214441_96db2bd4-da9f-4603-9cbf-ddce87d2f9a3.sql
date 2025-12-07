-- Drop and recreate the get_scouter_leads function with improved duplicate detection
CREATE OR REPLACE FUNCTION public.get_scouter_leads(
  p_scouter_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  nome_modelo TEXT,
  criado TIMESTAMPTZ,
  local_abordagem TEXT,
  etapa TEXT,
  has_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH lead_data AS (
    SELECT 
      l.id,
      l.nome_modelo,
      l.criado,
      l.local_abordagem,
      l.etapa,
      -- Extract phone from celular OR from raw->PHONE array
      COALESCE(
        NULLIF(TRIM(l.celular), ''),
        NULLIF(TRIM((l.raw->'PHONE'->0->>'VALUE')::text), '')
      ) AS phone_extracted
    FROM leads l
    WHERE l.scouter = p_scouter_name
      AND (p_start_date IS NULL OR l.criado::date >= p_start_date)
      AND (p_end_date IS NULL OR l.criado::date <= p_end_date)
      AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
      AND (
        p_filter_type IS NULL
        OR (p_filter_type = 'total' AND TRUE)
        OR (p_filter_type = 'com_foto' AND l.cadastro_existe_foto = true)
        OR (p_filter_type = 'sem_foto' AND (l.cadastro_existe_foto = false OR l.cadastro_existe_foto IS NULL))
        OR (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL)
        OR (p_filter_type = 'confirmados' AND l.ficha_confirmada = true)
        OR (p_filter_type = 'compareceram' AND l.compareceu = true)
        OR (p_filter_type = 'duplicados' AND TRUE) -- Will be filtered after
      )
  ),
  -- Build a list of all phones that appear more than once in the ENTIRE leads table
  duplicate_phones AS (
    SELECT 
      COALESCE(
        NULLIF(TRIM(celular), ''),
        NULLIF(TRIM((raw->'PHONE'->0->>'VALUE')::text), '')
      ) AS phone
    FROM leads
    WHERE COALESCE(
      NULLIF(TRIM(celular), ''),
      NULLIF(TRIM((raw->'PHONE'->0->>'VALUE')::text), '')
    ) IS NOT NULL
    GROUP BY COALESCE(
      NULLIF(TRIM(celular), ''),
      NULLIF(TRIM((raw->'PHONE'->0->>'VALUE')::text), '')
    )
    HAVING COUNT(*) > 1
  )
  SELECT 
    ld.id,
    ld.nome_modelo,
    ld.criado,
    ld.local_abordagem,
    ld.etapa,
    (ld.phone_extracted IS NOT NULL AND EXISTS (
      SELECT 1 FROM duplicate_phones dp WHERE dp.phone = ld.phone_extracted
    )) AS has_duplicate
  FROM lead_data ld
  WHERE (
    p_filter_type IS NULL 
    OR p_filter_type != 'duplicados'
    OR (p_filter_type = 'duplicados' AND ld.phone_extracted IS NOT NULL AND EXISTS (
      SELECT 1 FROM duplicate_phones dp WHERE dp.phone = ld.phone_extracted
    ))
  )
  ORDER BY ld.criado DESC;
END;
$$;