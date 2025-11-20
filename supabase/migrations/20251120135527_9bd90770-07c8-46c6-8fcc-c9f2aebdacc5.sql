-- FASE 1 & 6: Popular display_name em bitrix_fields_cache
-- Atualizar display_name com listLabel quando disponível
UPDATE bitrix_fields_cache
SET display_name = COALESCE(
  (list_items->0->>'listLabel'),
  field_title,
  field_id
)
WHERE display_name IS NULL OR display_name = '';

-- FASE 8: Criar trigger para auto-popular display_name em novos campos
CREATE OR REPLACE FUNCTION auto_populate_display_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := COALESCE(
      NEW.list_items->0->>'listLabel',
      NEW.field_title,
      NEW.field_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_bitrix_fields_cache
  BEFORE INSERT OR UPDATE ON bitrix_fields_cache
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_display_name();