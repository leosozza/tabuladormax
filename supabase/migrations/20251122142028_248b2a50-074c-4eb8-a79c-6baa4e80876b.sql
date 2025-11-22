-- Corrigir search_path da função fix_scouter_names_filtered
DROP FUNCTION IF EXISTS fix_scouter_names_filtered(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION fix_scouter_names_filtered(
  p_project_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE(leads_fixed INTEGER, leads_not_found INTEGER) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed INTEGER := 0;
  v_not_found INTEGER := 0;
BEGIN
  -- Atualizar leads com IDs numéricos para nomes
  WITH updates AS (
    UPDATE leads l
    SET scouter = bse.title,
        updated_at = NOW()
    FROM bitrix_spa_entities bse
    WHERE l.scouter ~ '^[0-9]+$'
      AND l.commercial_project_id = p_project_id
      AND l.criado >= p_start_date
      AND l.criado <= p_end_date
      AND bse.entity_type_id = 1096
      AND bse.bitrix_item_id = CAST(l.scouter AS INTEGER)
    RETURNING l.id
  )
  SELECT COUNT(*) INTO v_fixed FROM updates;
  
  -- Contar IDs não mapeados
  SELECT COUNT(*) INTO v_not_found
  FROM leads l
  WHERE l.scouter ~ '^[0-9]+$'
    AND l.commercial_project_id = p_project_id
    AND l.criado >= p_start_date
    AND l.criado <= p_end_date
    AND NOT EXISTS (
      SELECT 1 FROM bitrix_spa_entities bse
      WHERE bse.entity_type_id = 1096
        AND bse.bitrix_item_id = CAST(l.scouter AS INTEGER)
    );
  
  RETURN QUERY SELECT v_fixed, v_not_found;
END;
$$;