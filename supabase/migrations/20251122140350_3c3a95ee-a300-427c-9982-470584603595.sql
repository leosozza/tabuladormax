-- Função SQL para correção em massa de scouters com IDs numéricos
CREATE OR REPLACE FUNCTION fix_scouter_names()
RETURNS TABLE(
  leads_fixed INTEGER,
  leads_not_found INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed INTEGER := 0;
  v_not_found INTEGER := 0;
BEGIN
  -- Update em massa usando JOIN
  WITH updates AS (
    UPDATE leads l
    SET scouter = bse.title,
        updated_at = NOW()
    FROM bitrix_spa_entities bse
    WHERE l.scouter ~ '^[0-9]+$'
      AND bse.entity_type_id = 1096
      AND bse.bitrix_item_id = CAST(l.scouter AS INTEGER)
    RETURNING l.id
  )
  SELECT COUNT(*) INTO v_fixed FROM updates;
  
  -- Contar IDs que não têm correspondência
  SELECT COUNT(*) INTO v_not_found
  FROM leads l
  WHERE l.scouter ~ '^[0-9]+$'
    AND NOT EXISTS (
      SELECT 1 FROM bitrix_spa_entities bse
      WHERE bse.entity_type_id = 1096
        AND bse.bitrix_item_id = CAST(l.scouter AS INTEGER)
    );
  
  RETURN QUERY SELECT v_fixed, v_not_found;
END;
$$;

-- Função trigger que converte ID para nome automaticamente
CREATE OR REPLACE FUNCTION auto_resolve_scouter_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Se scouter é numérico, tentar resolver
  IF NEW.scouter IS NOT NULL AND NEW.scouter ~ '^[0-9]+$' THEN
    SELECT title INTO NEW.scouter
    FROM bitrix_spa_entities
    WHERE entity_type_id = 1096
      AND bitrix_item_id = CAST(NEW.scouter AS INTEGER)
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para resolver scouter IDs automaticamente
DROP TRIGGER IF EXISTS resolve_scouter_before_insert ON leads;
CREATE TRIGGER resolve_scouter_before_insert
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_scouter_id();

COMMENT ON FUNCTION fix_scouter_names() IS 'Corrige em massa leads que têm IDs numéricos no campo scouter, substituindo pelo nome correto de bitrix_spa_entities';
COMMENT ON FUNCTION auto_resolve_scouter_id() IS 'Trigger que automaticamente converte IDs numéricos de scouter para nomes ao inserir/atualizar leads';