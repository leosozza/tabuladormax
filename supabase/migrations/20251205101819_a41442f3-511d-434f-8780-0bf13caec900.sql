-- Criar tabela para jobs de reprocessamento em background
CREATE TABLE IF NOT EXISTS public.lead_reprocess_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  total_leads INTEGER DEFAULT 0,
  processed_leads INTEGER DEFAULT 0,
  updated_leads INTEGER DEFAULT 0,
  skipped_leads INTEGER DEFAULT 0,
  error_leads INTEGER DEFAULT 0,
  last_processed_id BIGINT DEFAULT NULL,
  batch_size INTEGER DEFAULT 5000,
  only_missing_fields BOOLEAN DEFAULT false,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL,
  error_details JSONB DEFAULT '[]'::jsonb,
  created_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_reprocess_jobs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins podem gerenciar jobs de reprocessamento"
ON public.lead_reprocess_jobs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_lead_reprocess_jobs_updated_at
  BEFORE UPDATE ON public.lead_reprocess_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar função SQL otimizada para processamento em batches
CREATE OR REPLACE FUNCTION public.reprocess_leads_batch(
  p_batch_size INTEGER DEFAULT 5000,
  p_last_processed_id BIGINT DEFAULT NULL,
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
  v_processed_count INTEGER := 0;
  v_new_last_id BIGINT := NULL;
  v_fontes_com_scouter TEXT[] := ARRAY['Scouter - Fichas', 'Scouters', 'Chamadas'];
BEGIN
  -- Create temp table with leads to process
  CREATE TEMP TABLE temp_leads_to_process AS
  SELECT l.id, l.raw
  FROM leads l
  WHERE l.raw IS NOT NULL
    AND (p_last_processed_id IS NULL OR l.id > p_last_processed_id)
    AND (NOT p_only_missing_fields OR (
      (l.scouter IS NULL AND l.fonte_normalizada = ANY(v_fontes_com_scouter))
      OR l.fonte IS NULL
      OR l.etapa IS NULL
      OR l.commercial_project_id IS NULL
    ))
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
  ORDER BY l.id ASC
  LIMIT p_batch_size;

  -- Get count and last ID
  SELECT COUNT(*), MAX(id) INTO v_processed_count, v_new_last_id
  FROM temp_leads_to_process;

  -- If no leads to process, return early
  IF v_processed_count = 0 THEN
    DROP TABLE IF EXISTS temp_leads_to_process;
    RETURN jsonb_build_object(
      'success', true,
      'processed_count', 0,
      'updated_count', 0,
      'last_processed_id', p_last_processed_id,
      'has_more', false
    );
  END IF;

  -- Create project lookup
  CREATE TEMP TABLE temp_project_lookup AS
  SELECT DISTINCT
    t.id as lead_id,
    cp.id as project_id
  FROM temp_leads_to_process t
  JOIN leads l ON l.id = t.id
  LEFT JOIN commercial_projects cp ON cp.code = COALESCE(l.raw->>'UF_CRM_1741215746', l.raw->>'PARENT_ID_1120');

  -- Update leads
  WITH updated_leads AS (
    UPDATE leads l
    SET
      scouter = CASE 
        WHEN l.raw->>'TITLE' LIKE '%SCOUTER-%' 
        THEN TRIM(SPLIT_PART(l.raw->>'TITLE', 'SCOUTER-', 2))
        ELSE l.scouter
      END,
      fonte = COALESCE(l.raw->>'SOURCE_ID', l.fonte),
      etapa = COALESCE(l.raw->>'STATUS_ID', l.etapa),
      date_closed = CASE
        WHEN l.raw->>'DATE_CLOSED' IS NOT NULL AND l.raw->>'DATE_CLOSED' != ''
        THEN (l.raw->>'DATE_CLOSED')::TIMESTAMPTZ
        ELSE l.date_closed
      END,
      commercial_project_id = COALESCE(tpl.project_id, l.commercial_project_id),
      nome_modelo = CASE
        WHEN jsonb_typeof(l.raw->'UF_CRM_LEAD_1732627097745') = 'array' AND jsonb_array_length(l.raw->'UF_CRM_LEAD_1732627097745') > 0
        THEN TRIM((l.raw->'UF_CRM_LEAD_1732627097745'->0)::TEXT, '"')
        ELSE l.nome_modelo
      END,
      valor_ficha = CASE
        WHEN l.raw->>'UF_CRM_VALORFICHA' ~ '^[0-9]+(\.[0-9]+)?'
        THEN (regexp_match(l.raw->>'UF_CRM_VALORFICHA', '^([0-9]+(?:\.[0-9]+)?)'))[1]::NUMERIC
        ELSE l.valor_ficha
      END,
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
    FROM temp_leads_to_process t
    LEFT JOIN temp_project_lookup tpl ON tpl.lead_id = t.id
    WHERE l.id = t.id
    RETURNING l.id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated_leads;

  -- Cleanup
  DROP TABLE IF EXISTS temp_leads_to_process;
  DROP TABLE IF EXISTS temp_project_lookup;

  -- Check if there are more leads
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'updated_count', v_updated_count,
    'last_processed_id', v_new_last_id,
    'has_more', v_processed_count = p_batch_size
  );
END;
$$;

-- Function to count total leads to process
CREATE OR REPLACE FUNCTION public.count_leads_to_reprocess(
  p_only_missing_fields BOOLEAN DEFAULT false,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count BIGINT;
  v_fontes_com_scouter TEXT[] := ARRAY['Scouter - Fichas', 'Scouters', 'Chamadas'];
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM leads l
  WHERE l.raw IS NOT NULL
    AND (NOT p_only_missing_fields OR (
      (l.scouter IS NULL AND l.fonte_normalizada = ANY(v_fontes_com_scouter))
      OR l.fonte IS NULL
      OR l.etapa IS NULL
      OR l.commercial_project_id IS NULL
    ))
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to);
  
  RETURN v_count;
END;
$$;