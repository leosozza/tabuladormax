-- FASE 4: Melhorias no Banco de Dados

-- FASE 4.1: Adicionar coluna display_name e campos relacionados à bitrix_fields_cache
ALTER TABLE bitrix_fields_cache
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS custom_title_set_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS custom_title_set_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_bitrix_fields_cache_display_name 
ON bitrix_fields_cache(display_name);

-- FASE 4.2: Atualizar tabela field_mapping_history (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'field_mapping_history') THEN
    CREATE TABLE field_mapping_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name TEXT NOT NULL,
      mapping_id UUID NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'reordered')),
      changed_by UUID REFERENCES auth.users(id),
      changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      old_values JSONB,
      new_values JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_field_mapping_history_mapping_id ON field_mapping_history(mapping_id);
    CREATE INDEX idx_field_mapping_history_table_name ON field_mapping_history(table_name);
    CREATE INDEX idx_field_mapping_history_changed_at ON field_mapping_history(changed_at DESC);
    
    ALTER TABLE field_mapping_history ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Recreate policies (drop if exists first)
DROP POLICY IF EXISTS "Admins and managers can view mapping history" ON field_mapping_history;
DROP POLICY IF EXISTS "System can insert mapping history" ON field_mapping_history;

CREATE POLICY "Admins and managers can view mapping history"
ON field_mapping_history FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "System can insert mapping history"
ON field_mapping_history FOR INSERT
WITH CHECK (true);