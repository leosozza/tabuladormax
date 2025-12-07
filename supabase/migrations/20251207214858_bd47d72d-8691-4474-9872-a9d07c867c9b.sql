-- Drop all existing versions of get_scouter_leads to avoid conflicts
DROP FUNCTION IF EXISTS public.get_scouter_leads(text, date, date, uuid, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads(text, timestamp with time zone, timestamp with time zone, uuid, text);

-- Recreate with timestamp parameters (matching what frontend sends)
CREATE OR REPLACE FUNCTION public.get_scouter_leads(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id BIGINT,
  nome_modelo TEXT,
  criado TIMESTAMPTZ,
  local_abordagem TEXT,
  etapa TEXT,
  has_duplicate BOOLEAN,
  is_duplicate_deleted BOOLEAN
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
      ) AS phone_extracted,
      l.cadastro_existe_foto,
      l.ficha_confirmada,
      l.compareceu,
      l.data_agendamento
    FROM leads l
    WHERE l.scouter = p_scouter_name
      AND (p_date_from IS NULL OR l.criado >= p_date_from)
      AND (p_date_to IS NULL OR l.criado <= p_date_to)
      AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
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
    AND LENGTH(COALESCE(
      NULLIF(TRIM(celular), ''),
      NULLIF(TRIM((raw->'PHONE'->0->>'VALUE')::text), '')
    )) >= 10 -- Filter out invalid short values
    GROUP BY COALESCE(
      NULLIF(TRIM(celular), ''),
      NULLIF(TRIM((raw->'PHONE'->0->>'VALUE')::text), '')
    )
    HAVING COUNT(*) > 1
  ),
  -- Check if any duplicate is marked as deleted
  deleted_duplicates AS (
    SELECT 
      COALESCE(
        NULLIF(TRIM(celular), ''),
        NULLIF(TRIM((raw->'PHONE'->0->>'VALUE')::text), '')
      ) AS phone
    FROM leads
    WHERE etapa = 'Excluir Lead'
      AND COALESCE(
        NULLIF(TRIM(celular), ''),
        NULLIF(TRIM((raw->'PHONE'->0->>'VALUE')::text), '')
      ) IS NOT NULL
  )
  SELECT 
    ld.id,
    ld.nome_modelo,
    ld.criado,
    ld.local_abordagem,
    ld.etapa,
    (ld.phone_extracted IS NOT NULL 
     AND LENGTH(ld.phone_extracted) >= 10
     AND EXISTS (
      SELECT 1 FROM duplicate_phones dp WHERE dp.phone = ld.phone_extracted
    )) AS has_duplicate,
    (ld.phone_extracted IS NOT NULL 
     AND EXISTS (
      SELECT 1 FROM deleted_duplicates dd WHERE dd.phone = ld.phone_extracted
    )) AS is_duplicate_deleted
  FROM lead_data ld
  WHERE (
    p_filter_type IS NULL 
    OR p_filter_type = 'all'
    OR p_filter_type = 'total'
    OR (p_filter_type = 'com_foto' AND ld.cadastro_existe_foto = true)
    OR (p_filter_type = 'sem_foto' AND (ld.cadastro_existe_foto = false OR ld.cadastro_existe_foto IS NULL))
    OR (p_filter_type = 'agendados' AND ld.data_agendamento IS NOT NULL)
    OR (p_filter_type = 'confirmados' AND ld.ficha_confirmada = true)
    OR (p_filter_type = 'compareceram' AND ld.compareceu = true)
    OR (p_filter_type = 'duplicados' AND ld.phone_extracted IS NOT NULL AND LENGTH(ld.phone_extracted) >= 10 AND EXISTS (
      SELECT 1 FROM duplicate_phones dp WHERE dp.phone = ld.phone_extracted
    ))
  )
  ORDER BY ld.criado DESC;
END;
$$;