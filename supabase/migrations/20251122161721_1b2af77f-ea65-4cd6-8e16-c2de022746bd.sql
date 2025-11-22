-- Remover constraint antiga
ALTER TABLE bitrix_stage_mapping 
DROP CONSTRAINT IF EXISTS bitrix_stage_mapping_app_status_check;

-- Adicionar constraint nova com 'demissao'
ALTER TABLE bitrix_stage_mapping 
ADD CONSTRAINT bitrix_stage_mapping_app_status_check 
CHECK (app_status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'standby'::text, 'blacklist'::text, 'demissao'::text]));