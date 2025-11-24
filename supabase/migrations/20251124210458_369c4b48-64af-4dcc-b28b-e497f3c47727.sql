-- Fix timeout in reprocess_leads_from_raw_bulk function
-- Use JOINs instead of subqueries for better performance
CREATE OR REPLACE FUNCTION public.reprocess_leads_from_raw_bulk(
  p_only_missing_fields BOOLEAN DEFAULT false,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_fontes_com_scouter TEXT[] := ARRAY['Scouter - Fichas', 'Scouters', 'Chamadas'];
BEGIN
  -- Increase statement timeout to 5 minutes
  SET LOCAL statement_timeout = '300s';
  
  -- Create temp table with project lookups to avoid repeated subqueries
  CREATE TEMP TABLE temp_project_lookup AS
  SELECT DISTINCT
    l.id as lead_id,
    cp.id as project_id
  FROM leads l
  LEFT JOIN commercial_projects cp ON cp.code = COALESCE(l.raw->>'UF_CRM_1741215746', l.raw->>'PARENT_ID_1120')
  WHERE l.raw IS NOT NULL
    AND (NOT p_only_missing_fields OR (
      (l.scouter IS NULL AND l.fonte_normalizada = ANY(v_fontes_com_scouter))
      OR l.fonte IS NULL
      OR l.etapa IS NULL
      OR l.commercial_project_id IS NULL
    ))
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to);
  
  -- Update leads using the pre-computed project lookup
  WITH updated_leads AS (
    UPDATE leads l
    SET
      -- Extract scouter from TITLE (if contains "SCOUTER-")
      scouter = CASE 
        WHEN l.raw->>'TITLE' LIKE '%SCOUTER-%' 
        THEN TRIM(SPLIT_PART(l.raw->>'TITLE', 'SCOUTER-', 2))
        ELSE l.scouter
      END,
      
      -- Map fonte
      fonte = COALESCE(l.raw->>'SOURCE_ID', l.fonte),
      
      -- Map etapa
      etapa = COALESCE(l.raw->>'STATUS_ID', l.etapa),
      
      -- Map date_closed (NEW!)
      date_closed = CASE
        WHEN l.raw->>'DATE_CLOSED' IS NOT NULL AND l.raw->>'DATE_CLOSED' != ''
        THEN (l.raw->>'DATE_CLOSED')::TIMESTAMPTZ
        ELSE l.date_closed
      END,
      
      -- Map commercial_project_id via pre-computed lookup
      commercial_project_id = COALESCE(tpl.project_id, l.commercial_project_id),
      
      -- Map nome_modelo (first item of array)
      nome_modelo = CASE
        WHEN jsonb_typeof(l.raw->'UF_CRM_LEAD_1732627097745') = 'array' AND jsonb_array_length(l.raw->'UF_CRM_LEAD_1732627097745') > 0
        THEN TRIM((l.raw->'UF_CRM_LEAD_1732627097745'->0)::TEXT, '"')
        ELSE l.nome_modelo
      END,
      
      -- Map valor_ficha (extract number from "6|BRL")
      valor_ficha = CASE
        WHEN l.raw->>'UF_CRM_VALORFICHA' ~ '^[0-9]+(\.[0-9]+)?'
        THEN (regexp_match(l.raw->>'UF_CRM_VALORFICHA', '^([0-9]+(?:\.[0-9]+)?)'))[1]::NUMERIC
        ELSE l.valor_ficha
      END,
      
      -- Map phones
      telefone_casa = CASE
        WHEN jsonb_typeof(l.raw->'PHONE') = 'array' AND jsonb_array_length(l.raw->'PHONE') > 0
        THEN l.raw->'PHONE'->0->>'VALUE'
        ELSE l.telefone_casa
      END,
      
      celular = CASE
        WHEN jsonb_typeof(l.raw->'PHONE') = 'array' AND jsonb_array_length(l.raw->'PHONE') > 1
        THEN l.raw->'PHONE'->1->>'VALUE'
        WHEN jsonb_typeof(l.raw->'PHONE') = 'array' AND jsonb_array_length(l.raw->'PHONE') > 0
        THEN l.raw->'PHONE'->0->>'VALUE'
        ELSE l.celular
      END,
      
      -- Dates
      criado = CASE
        WHEN l.raw->>'DATE_CREATE' IS NOT NULL
        THEN (l.raw->>'DATE_CREATE')::TIMESTAMPTZ
        ELSE l.criado
      END,
      
      date_modify = CASE
        WHEN l.raw->>'DATE_MODIFY' IS NOT NULL
        THEN (l.raw->>'DATE_MODIFY')::TIMESTAMPTZ
        ELSE l.date_modify
      END,
      
      updated_at = NOW()
    FROM temp_project_lookup tpl
    WHERE
      l.id = tpl.lead_id
      AND l.raw IS NOT NULL
    RETURNING l.id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated_leads;
  
  -- Clean up temp table
  DROP TABLE IF EXISTS temp_project_lookup;
  
  -- Return statistics
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', format('✅ %s leads re-processados com sucesso', v_updated_count)
  );
END;
$$;