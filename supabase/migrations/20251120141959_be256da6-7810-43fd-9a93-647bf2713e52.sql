-- Configurar transform_function para o campo age
UPDATE unified_field_config
SET transform_function = 'toInteger'
WHERE supabase_field = 'age'
  AND bitrix_field = 'UF_CRM_1739563541'
  AND sync_active = true;