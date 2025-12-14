-- Adicionar coluna phone_normalized para otimizar busca de duplicados
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

-- Criar índice para busca rápida de duplicados
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized 
ON leads(phone_normalized) 
WHERE phone_normalized IS NOT NULL AND phone_normalized != '';

-- Índice composto para buscas com data
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized_criado 
ON leads(phone_normalized, criado DESC) 
WHERE phone_normalized IS NOT NULL AND phone_normalized != '';

-- Função para normalizar telefone
CREATE OR REPLACE FUNCTION normalize_phone_number(celular TEXT, raw_phone JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  phone TEXT;
BEGIN
  phone := COALESCE(
    NULLIF(TRIM(celular), ''), 
    NULLIF(TRIM(raw_phone->0->>'VALUE'), '')
  );
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN REGEXP_REPLACE(phone, '\D', '', 'g');
END;
$$;

-- Trigger para manter phone_normalized atualizado
CREATE OR REPLACE FUNCTION leads_normalize_phone_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone_normalized := normalize_phone_number(NEW.celular, NEW.raw->'PHONE');
  RETURN NEW;
END;
$$;

-- Criar trigger (se não existir)
DROP TRIGGER IF EXISTS leads_normalize_phone ON leads;
CREATE TRIGGER leads_normalize_phone
BEFORE INSERT OR UPDATE OF celular, raw ON leads
FOR EACH ROW EXECUTE FUNCTION leads_normalize_phone_trigger();

-- Atualizar função get_scouter_portal_stats para usar phone_normalized
CREATE OR REPLACE FUNCTION public.get_scouter_portal_stats(
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
  pendentes BIGINT,
  duplicados BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH scouter_leads AS (
    SELECT 
      l.id,
      l.photo_url,
      l.data_confirmacao_ficha,
      l.data_agendamento,
      l.etapa_funil,
      l.status_fluxo,
      l.compareceu,
      l.phone_normalized
    FROM leads l
    WHERE l.scouter = p_scouter_name
      AND (p_start_date IS NULL OR l.criado >= p_start_date)
      AND (p_end_date IS NULL OR l.criado <= p_end_date)
      AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
  ),
  duplicates AS (
    SELECT sl.id
    FROM scouter_leads sl
    WHERE sl.phone_normalized IS NOT NULL 
      AND sl.phone_normalized != ''
      AND LENGTH(sl.phone_normalized) >= 8
      AND EXISTS (
        SELECT 1 FROM leads other
        WHERE other.id != sl.id
          AND other.phone_normalized = sl.phone_normalized
          AND other.criado >= NOW() - INTERVAL '60 days'
      )
  )
  SELECT
    COUNT(*)::BIGINT as total_leads,
    COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '' AND photo_url != '[]')::BIGINT as com_foto,
    COUNT(*) FILTER (WHERE data_confirmacao_ficha IS NOT NULL)::BIGINT as confirmados,
    COUNT(*) FILTER (WHERE data_agendamento IS NOT NULL)::BIGINT as agendados,
    COUNT(*) FILTER (WHERE etapa_funil ILIKE '%reagendar%' OR status_fluxo ILIKE '%reagendar%')::BIGINT as reagendar,
    COUNT(*) FILTER (WHERE compareceu = true)::BIGINT as compareceram,
    COUNT(*) FILTER (WHERE data_confirmacao_ficha IS NULL)::BIGINT as pendentes,
    (SELECT COUNT(*) FROM duplicates)::BIGINT as duplicados
  FROM scouter_leads;
END;
$$;

-- Atualizar função get_scouter_leads_simple para usar phone_normalized
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  lead_id BIGINT,
  nome_modelo TEXT,
  criado TIMESTAMPTZ,
  address TEXT,
  etapa_lead TEXT,
  celular TEXT,
  commercial_project_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id::BIGINT as lead_id,
    l.nome_modelo::TEXT,
    l.criado,
    COALESCE(
      NULLIF(TRIM(l.address), ''),
      NULLIF(TRIM(l.raw->>'UF_CRM_1740503916697'), '')
    )::TEXT as address,
    l.etapa::TEXT as etapa_lead,
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
    AND (
      p_filter_type = 'all'
      OR (p_filter_type = 'com_foto' AND l.photo_url IS NOT NULL AND l.photo_url != '' AND l.photo_url != '[]')
      OR (p_filter_type = 'confirmados' AND l.data_confirmacao_ficha IS NOT NULL)
      OR (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL)
      OR (p_filter_type = 'reagendar' AND (l.etapa_funil ILIKE '%reagendar%' OR l.status_fluxo ILIKE '%reagendar%'))
      OR (p_filter_type = 'compareceram' AND l.compareceu = true)
      OR (p_filter_type = 'pendentes' AND l.data_confirmacao_ficha IS NULL)
      OR (p_filter_type = 'duplicados' AND 
        l.phone_normalized IS NOT NULL AND 
        l.phone_normalized != '' AND
        LENGTH(l.phone_normalized) >= 8 AND
        EXISTS (
          SELECT 1 FROM leads other
          WHERE other.id != l.id
            AND other.phone_normalized = l.phone_normalized
            AND other.criado >= NOW() - INTERVAL '60 days'
        )
      )
    )
  ORDER BY l.criado DESC;
END;
$$;