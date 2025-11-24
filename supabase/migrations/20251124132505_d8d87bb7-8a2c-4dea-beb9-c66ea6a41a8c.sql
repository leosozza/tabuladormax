-- Criar função para re-processar leads em massa
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
  -- Atualizar leads em massa usando dados do raw
  WITH updated_leads AS (
    UPDATE leads
    SET
      -- Extrair scouter do TITLE (se contém "SCOUTER-")
      scouter = CASE 
        WHEN raw->>'TITLE' LIKE '%SCOUTER-%' 
        THEN TRIM(SPLIT_PART(raw->>'TITLE', 'SCOUTER-', 2))
        ELSE scouter
      END,
      
      -- Mapear fonte
      fonte = COALESCE(raw->>'SOURCE_ID', fonte),
      
      -- Mapear etapa
      etapa = COALESCE(raw->>'STATUS_ID', etapa),
      
      -- Mapear commercial_project_id via lookup
      commercial_project_id = COALESCE(
        (SELECT id FROM commercial_projects 
         WHERE code = COALESCE(raw->>'UF_CRM_1741215746', raw->>'PARENT_ID_1120')
         LIMIT 1),
        commercial_project_id
      ),
      
      -- Mapear nome_modelo (primeiro item do array)
      nome_modelo = CASE
        WHEN jsonb_typeof(raw->'UF_CRM_1759598815') = 'array' AND jsonb_array_length(raw->'UF_CRM_1759598815') > 0
        THEN TRIM((raw->'UF_CRM_1759598815'->0)::TEXT, '"')
        ELSE nome_modelo
      END,
      
      -- Mapear valor_ficha (extrair número de "6|BRL")
      valor_ficha = CASE
        WHEN raw->>'UF_CRM_VALORFICHA' ~ '^[0-9]+(\.[0-9]+)?'
        THEN (regexp_match(raw->>'UF_CRM_VALORFICHA', '^([0-9]+(?:\.[0-9]+)?)'))[1]::NUMERIC
        ELSE valor_ficha
      END,
      
      -- Mapear telefones
      telefone_casa = CASE
        WHEN jsonb_typeof(raw->'PHONE') = 'array' AND jsonb_array_length(raw->'PHONE') > 0
        THEN raw->'PHONE'->0->>'VALUE'
        ELSE telefone_casa
      END,
      
      celular = CASE
        WHEN jsonb_typeof(raw->'PHONE') = 'array' AND jsonb_array_length(raw->'PHONE') > 1
        THEN raw->'PHONE'->1->>'VALUE'
        WHEN jsonb_typeof(raw->'PHONE') = 'array' AND jsonb_array_length(raw->'PHONE') > 0
        THEN raw->'PHONE'->0->>'VALUE'
        ELSE celular
      END,
      
      -- Datas
      criado = CASE
        WHEN raw->>'DATE_CREATE' IS NOT NULL
        THEN (raw->>'DATE_CREATE')::TIMESTAMPTZ
        ELSE criado
      END,
      
      date_modify = CASE
        WHEN raw->>'DATE_MODIFY' IS NOT NULL
        THEN (raw->>'DATE_MODIFY')::TIMESTAMPTZ
        ELSE date_modify
      END,
      
      updated_at = NOW()
    WHERE
      raw IS NOT NULL
      -- Aplicar filtro de apenas campos faltando se solicitado
      AND (NOT p_only_missing_fields OR (
        (scouter IS NULL AND fonte_normalizada = ANY(v_fontes_com_scouter))
        OR fonte IS NULL
        OR etapa IS NULL
        OR commercial_project_id IS NULL
      ))
      -- Filtros de data opcionais
      AND (p_date_from IS NULL OR criado >= p_date_from)
      AND (p_date_to IS NULL OR criado <= p_date_to)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated_leads;
  
  -- Retornar estatísticas
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', format('✅ %s leads re-processados com sucesso', v_updated_count)
  );
END;
$$;

COMMENT ON FUNCTION public.reprocess_leads_from_raw_bulk IS 'Re-processa leads em massa extraindo dados do campo raw';

-- Grant execute para authenticated users
GRANT EXECUTE ON FUNCTION public.reprocess_leads_from_raw_bulk TO authenticated;