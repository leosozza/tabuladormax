-- Drop existing function
DROP FUNCTION IF EXISTS public.get_scouter_leads(text, timestamptz, timestamptz, uuid);

-- Create optimized function that searches duplicates across scouters within same project and 60-day window
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
      l.commercial_project_id,
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
  -- Step 2: Find duplicates across ANY scouter, same project, within 60-day window
  duplicate_check AS (
    SELECT DISTINCT ld.id
    FROM lead_data ld
    INNER JOIN leads other ON 
      -- Same phone number
      COALESCE(
        NULLIF(TRIM(other.celular), ''),
        NULLIF(TRIM((other.raw->'PHONE'->0->>'VALUE')::text), '')
      ) = ld.phone_extracted
      -- Same commercial project
      AND other.commercial_project_id = ld.commercial_project_id
      -- Within 60-day window (30 days before or after)
      AND other.criado BETWEEN (ld.criado - INTERVAL '30 days') 
                          AND (ld.criado + INTERVAL '30 days')
      -- Not the same lead
      AND other.id != ld.id
    WHERE ld.phone_extracted IS NOT NULL 
      AND LENGTH(ld.phone_extracted) >= 10
      AND ld.commercial_project_id IS NOT NULL
  )
  -- Step 3: Join to mark duplicates
  SELECT 
    ld.id AS lead_id,
    ld.nome_modelo,
    ld.criado,
    ld.address,
    ld.etapa AS etapa_lead,
    (dc.id IS NOT NULL) AS has_duplicate,
    FALSE AS is_duplicate_deleted
  FROM lead_data ld
  LEFT JOIN duplicate_check dc ON ld.id = dc.id
  ORDER BY ld.criado DESC;
END;
$$;

-- Add composite index to optimize duplicate search
CREATE INDEX IF NOT EXISTS idx_leads_project_criado_celular 
ON leads(commercial_project_id, criado DESC) 
WHERE commercial_project_id IS NOT NULL;