-- 1. Desativar mapeamento incorreto PARENT_ID_1120
UPDATE bitrix_field_mappings
SET active = false
WHERE bitrix_field = 'PARENT_ID_1120' 
  AND tabuladormax_field = 'commercial_project_id';

-- 2. Criar/atualizar mapeamento correto UF_CRM_1741215746 → commercial_project_id
INSERT INTO bitrix_field_mappings (
  bitrix_field,
  tabuladormax_field,
  transform_function,
  active,
  priority,
  bitrix_field_type,
  tabuladormax_field_type,
  notes
) VALUES (
  'UF_CRM_1741215746',
  'commercial_project_id',
  'bitrixProjectCodeToUUID',
  true,
  10,
  'string',
  'uuid',
  'Campo correto para Projeto Comercial: contém código numérico do projeto no Bitrix que deve ser mapeado para UUID via tabela commercial_projects'
) ON CONFLICT (bitrix_field, tabuladormax_field) 
DO UPDATE SET
  active = true,
  transform_function = 'bitrixProjectCodeToUUID',
  priority = 10,
  bitrix_field_type = 'string',
  tabuladormax_field_type = 'uuid',
  notes = 'Campo correto para Projeto Comercial: contém código numérico do projeto no Bitrix que deve ser mapeado para UUID via tabela commercial_projects',
  updated_at = now();