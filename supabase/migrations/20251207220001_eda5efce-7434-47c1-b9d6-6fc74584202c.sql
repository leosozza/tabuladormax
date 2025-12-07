-- Drop existing function
DROP FUNCTION IF EXISTS public.get_scouter_leads(text, timestamptz, timestamptz, uuid);

-- Create optimized function that searches duplicates ONLY within filtered leads
CREATE OR REPLACE FUNCTION public.get_scouter_leads(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  lead_id BIGINT,
  nome_modelo TEXT,
  criado TIMESTAMPTZ,
  address TEXT,
  etapa_lead TEXT,
  has_duplicate BOOLEAN,
  is_duplicate_deleted BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH lead_data AS (
    -- Step 1: Get only the filtered leads for this scouter/period
    SELECT 
      l.id,
      l.nome_modelo,
      l.criado,
      l.address,
      l.etapa,
      COALESCE(
        NULLIF(TRIM(l.celular), ''),
        NULLIF(TRIM((l.raw->'PHONE'->0->>'VALUE')::text), '')
      ) AS phone_extracted
    FROM leads l
    WHERE l.scouter = p_scouter_name
      AND (p_date_from IS NULL OR l.criado >= p_date_from)
      AND (p_date_to IS NULL OR l.criado <= p_date_to)
      AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
  ),
  -- Step 2: Find duplicate phones ONLY within the filtered leads
  duplicate_phones AS (
    SELECT ld.phone_extracted
    FROM lead_data ld
    WHERE ld.phone_extracted IS NOT NULL 
      AND LENGTH(ld.phone_extracted) >= 10
    GROUP BY ld.phone_extracted
    HAVING COUNT(*) > 1
  )
  -- Step 3: Join to mark duplicates
  SELECT 
    ld.id AS lead_id,
    ld.nome_modelo,
    ld.criado,
    ld.address,
    ld.etapa AS etapa_lead,
    (dp.phone_extracted IS NOT NULL) AS has_duplicate,
    FALSE AS is_duplicate_deleted
  FROM lead_data ld
  LEFT JOIN duplicate_phones dp ON ld.phone_extracted = dp.phone_extracted
  ORDER BY ld.criado DESC;
END;
$$;

-- Add index to improve performance
CREATE INDEX IF NOT EXISTS idx_leads_scouter_criado ON leads(scouter, criado DESC);