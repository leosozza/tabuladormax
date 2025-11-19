-- Adicionar coluna status_telefone na tabela leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS status_telefone TEXT;

-- Inserir mapeamento para Status de telefone
INSERT INTO unified_field_config (
  bitrix_field,
  supabase_field,
  sync_active,
  ui_active,
  display_name,
  category,
  field_type,
  sync_priority,
  ui_priority,
  bitrix_field_type
) VALUES (
  'UF_CRM_1754513110746',
  'status_telefone',
  true,
  true,
  'Status de telefone',
  'status',
  'enumeration',
  30,
  30,
  'enumeration'
)
ON CONFLICT (supabase_field) DO UPDATE SET
  bitrix_field = EXCLUDED.bitrix_field,
  sync_active = EXCLUDED.sync_active,
  ui_active = EXCLUDED.ui_active,
  display_name = EXCLUDED.display_name,
  updated_at = now();

-- Adicionar comentário de depreciação na tabela antiga
COMMENT ON TABLE bitrix_field_mappings IS 
'DEPRECATED: Use unified_field_config instead. This table is kept for historical purposes only.';