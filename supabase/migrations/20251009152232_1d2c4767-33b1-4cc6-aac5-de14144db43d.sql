
-- Adicionar coluna para campos adicionais a serem enviados junto com a ação
ALTER TABLE button_config ADD COLUMN IF NOT EXISTS additional_fields jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN button_config.additional_fields IS 'Array de objetos com campos adicionais a serem enviados: [{"field": "STATUS_ID", "value": "UC_QWPO2W"}, ...]';
