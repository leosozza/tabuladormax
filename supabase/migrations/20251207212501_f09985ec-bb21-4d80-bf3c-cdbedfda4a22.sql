
-- Função para buscar leads do scouter com detecção de duplicados
CREATE OR REPLACE FUNCTION get_scouter_leads(
  p_scouter_name TEXT,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id BIGINT,
  nome_modelo TEXT,
  criado TIMESTAMP WITH TIME ZONE,
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
      l.celular,
      l.cadastro_existe_foto,
      l.ficha_confirmada,
      l.compareceu,
      l.presenca_confirmada,
      l.ficha_paga
    FROM leads l
    WHERE l.scouter = p_scouter_name
      AND (p_date_from IS NULL OR l.criado >= p_date_from)
      AND (p_date_to IS NULL OR l.criado <= p_date_to)
      AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
  ),
  duplicates AS (
    SELECT 
      ld.id,
      EXISTS (
        SELECT 1 FROM leads other 
        WHERE other.celular = ld.celular 
          AND other.celular IS NOT NULL 
          AND other.celular != ''
          AND other.id != ld.id
      ) AS has_dup,
      EXISTS (
        SELECT 1 FROM leads other 
        WHERE other.celular = ld.celular 
          AND other.celular IS NOT NULL 
          AND other.celular != ''
          AND other.id != ld.id
          AND other.etapa = 'Excluir Lead'
      ) AS is_dup_deleted
    FROM lead_data ld
  )
  SELECT 
    ld.id,
    ld.nome_modelo,
    ld.criado,
    ld.local_abordagem,
    ld.etapa,
    d.has_dup AS has_duplicate,
    d.is_dup_deleted AS is_duplicate_deleted
  FROM lead_data ld
  JOIN duplicates d ON ld.id = d.id
  WHERE 
    CASE p_filter_type
      WHEN 'all' THEN TRUE
      WHEN 'com_foto' THEN ld.cadastro_existe_foto = TRUE
      WHEN 'confirmados' THEN ld.ficha_confirmada = TRUE
      WHEN 'compareceram' THEN ld.compareceu = TRUE
      WHEN 'presenca_confirmada' THEN ld.presenca_confirmada = TRUE
      WHEN 'pagos' THEN ld.ficha_paga = TRUE
      ELSE TRUE
    END
  ORDER BY ld.criado DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_scouter_leads TO authenticated;
