-- FASE 1: Criar nova tabela unificada field_mappings
CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação Bitrix (nullable porque nem todo campo tem correspondente no Bitrix)
  bitrix_field TEXT,
  bitrix_field_type TEXT,
  bitrix_display_name TEXT,
  
  -- Identificação Supabase
  supabase_field TEXT NOT NULL,
  supabase_field_type TEXT,
  
  -- Configuração de Exibição
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  field_type TEXT NOT NULL DEFAULT 'string',
  
  -- Transformações
  transform_function TEXT,
  formatter_function TEXT,
  
  -- Configuração UI
  default_visible BOOLEAN DEFAULT false,
  sortable BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  -- Controle
  active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_supabase_field UNIQUE(supabase_field)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_field_mappings_active ON field_mappings(active);
CREATE INDEX IF NOT EXISTS idx_field_mappings_priority ON field_mappings(priority);
CREATE INDEX IF NOT EXISTS idx_field_mappings_bitrix_field ON field_mappings(bitrix_field) WHERE bitrix_field IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_field_mappings_supabase_field ON field_mappings(supabase_field);

-- Trigger para updated_at
CREATE TRIGGER update_field_mappings_updated_at
  BEFORE UPDATE ON field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para auditoria
CREATE TRIGGER log_field_mappings_changes
  AFTER INSERT OR UPDATE OR DELETE ON field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION log_field_mapping_change();

-- RLS Policies
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar mapeamentos ativos"
  ON field_mappings FOR SELECT
  USING (active = true);

CREATE POLICY "Admins e managers podem gerenciar mapeamentos"
  ON field_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- FASE 2: Migrar dados de bitrix_field_mappings (pegar apenas primeira ocorrência por supabase_field)
WITH ranked_bitrix AS (
  SELECT 
    bitrix_field,
    bitrix_field_type,
    tabuladormax_field,
    tabuladormax_field_type,
    transform_function,
    priority,
    active,
    notes,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY tabuladormax_field ORDER BY priority DESC, created_at DESC) as rn
  FROM bitrix_field_mappings
  WHERE active = true
)
INSERT INTO field_mappings (
  bitrix_field,
  bitrix_field_type,
  supabase_field,
  supabase_field_type,
  display_name,
  transform_function,
  priority,
  active,
  notes,
  created_at,
  updated_at
)
SELECT 
  bitrix_field,
  bitrix_field_type,
  tabuladormax_field,
  tabuladormax_field_type,
  COALESCE(notes, tabuladormax_field),
  transform_function,
  COALESCE(priority, 0),
  COALESCE(active, true),
  notes,
  created_at,
  updated_at
FROM ranked_bitrix
WHERE rn = 1;

-- FASE 3: Complementar/atualizar com dados de gestao_scouter_field_mappings
WITH ranked_gestao AS (
  SELECT 
    database_field,
    field_type,
    display_name,
    category,
    formatter_function,
    default_visible,
    sortable,
    priority,
    active,
    created_at,
    updated_at,
    created_by,
    updated_by,
    ROW_NUMBER() OVER (PARTITION BY database_field ORDER BY priority DESC, created_at DESC) as rn
  FROM gestao_scouter_field_mappings
  WHERE active = true
)
INSERT INTO field_mappings (
  supabase_field,
  supabase_field_type,
  display_name,
  category,
  field_type,
  formatter_function,
  default_visible,
  sortable,
  priority,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT 
  database_field,
  field_type,
  display_name,
  category,
  field_type,
  formatter_function,
  default_visible,
  sortable,
  priority,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by
FROM ranked_gestao
WHERE rn = 1
ON CONFLICT (supabase_field) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  field_type = EXCLUDED.field_type,
  formatter_function = EXCLUDED.formatter_function,
  default_visible = EXCLUDED.default_visible,
  sortable = EXCLUDED.sortable,
  supabase_field_type = EXCLUDED.supabase_field_type,
  updated_at = EXCLUDED.updated_at;