-- Fix get_scouter_leads_simple to extract address from raw field
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name text, 
  p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_project_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  lead_id bigint, 
  nome_modelo text, 
  criado timestamp with time zone, 
  address text, 
  etapa_lead text, 
  celular text, 
  commercial_project_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.id::BIGINT as lead_id,
    l.nome_modelo::TEXT,
    l.criado,
    -- Extract address from raw field if main column is NULL
    COALESCE(
      NULLIF(TRIM(l.address), ''),
      NULLIF(TRIM(l.raw->>'UF_CRM_1740503916697'), '')
    )::TEXT as address,
    l.etapa::TEXT as etapa_lead,
    -- Extract phone from raw field if celular is NULL
    COALESCE(
      NULLIF(TRIM(l.celular), ''),
      NULLIF(TRIM(l.raw->'PHONE'->0->>'VALUE'), '')
    )::TEXT as celular,
    l.commercial_project_id
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
  ORDER BY l.criado DESC;
END;
$function$;

-- Fix check_leads_duplicates to extract phone from raw field and normalize for comparison
CREATE OR REPLACE FUNCTION public.check_leads_duplicates(
  p_lead_ids bigint[], 
  p_project_id uuid DEFAULT NULL::uuid, 
  p_days_back integer DEFAULT 60
)
RETURNS TABLE(
  lead_id bigint, 
  has_duplicate boolean, 
  duplicate_lead_id bigint, 
  is_duplicate_deleted boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH lead_phones AS (
    -- Get phones for leads we want to check, extracting from raw if needed
    SELECT 
      l.id,
      -- Normalize phone: remove all non-digits for comparison
      REGEXP_REPLACE(
        COALESCE(
          NULLIF(TRIM(l.celular), ''),
          NULLIF(TRIM(l.raw->'PHONE'->0->>'VALUE'), '')
        ),
        '\D', '', 'g'
      ) as phone_normalized,
      l.criado,
      l.commercial_project_id
    FROM leads l
    WHERE l.id = ANY(p_lead_ids)
  ),
  duplicates AS (
    -- Find duplicates: leads with same normalized phone in same project
    SELECT DISTINCT ON (lp.id)
      lp.id as original_id,
      other.id as duplicate_id,
      CASE 
        WHEN other.etapa IN ('JUNK', 'Excluir Lead') THEN true
        ELSE false
      END as is_deleted
    FROM lead_phones lp
    INNER JOIN leads other ON 
      -- Normalize other phone for comparison
      REGEXP_REPLACE(
        COALESCE(
          NULLIF(TRIM(other.celular), ''),
          NULLIF(TRIM(other.raw->'PHONE'->0->>'VALUE'), '')
        ),
        '\D', '', 'g'
      ) = lp.phone_normalized
      AND other.id != lp.id
      AND other.criado >= NOW() - (p_days_back || ' days')::interval
      AND (p_project_id IS NULL OR other.commercial_project_id = p_project_id)
      AND lp.phone_normalized IS NOT NULL
      AND lp.phone_normalized != ''
    ORDER BY lp.id, other.criado ASC
  )
  SELECT 
    unnest.id::BIGINT as lead_id,
    CASE WHEN d.duplicate_id IS NOT NULL THEN true ELSE false END as has_duplicate,
    d.duplicate_id::BIGINT as duplicate_lead_id,
    COALESCE(d.is_deleted, false) as is_duplicate_deleted
  FROM unnest(p_lead_ids) AS unnest(id)
  LEFT JOIN duplicates d ON d.original_id = unnest.id;
END;
$function$;