-- Função 1: Carrega leads de forma RÁPIDA sem verificar duplicados
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
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
    l.address::TEXT,
    l.etapa::TEXT as etapa_lead,
    l.celular::TEXT,
    l.commercial_project_id
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
  ORDER BY l.criado DESC;
END;
$$;

-- Função 2: Verifica duplicados para um lote de leads
CREATE OR REPLACE FUNCTION public.check_leads_duplicates(
  p_lead_ids BIGINT[],
  p_project_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 60
)
RETURNS TABLE (
  lead_id BIGINT,
  has_duplicate BOOLEAN,
  duplicate_lead_id BIGINT,
  is_duplicate_deleted BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH lead_phones AS (
    -- Pegar os telefones dos leads que queremos verificar
    SELECT 
      l.id,
      l.celular,
      l.criado,
      l.commercial_project_id
    FROM leads l
    WHERE l.id = ANY(p_lead_ids)
      AND l.celular IS NOT NULL
      AND l.celular != ''
  ),
  duplicates AS (
    -- Buscar duplicados: leads com mesmo telefone no mesmo projeto
    SELECT DISTINCT ON (lp.id)
      lp.id as original_id,
      other.id as duplicate_id,
      CASE 
        WHEN other.etapa IN ('JUNK', 'Excluir Lead') THEN true
        ELSE false
      END as is_deleted
    FROM lead_phones lp
    INNER JOIN leads other ON 
      other.celular = lp.celular
      AND other.id != lp.id
      AND other.criado >= NOW() - (p_days_back || ' days')::interval
      AND (p_project_id IS NULL OR other.commercial_project_id = p_project_id)
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
$$;