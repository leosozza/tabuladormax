-- ============================================
-- ETAPA 1: Criar tabela unified_field_config
-- e migrar dados das tabelas antigas (CORRIGIDO)
-- ============================================

-- Criar nova tabela unificada
CREATE TABLE IF NOT EXISTS public.unified_field_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campo base (Supabase)
  supabase_field TEXT NOT NULL UNIQUE,
  supabase_type TEXT,
  is_nullable TEXT,
  
  -- Mapeamento Bitrix (para sincronização)
  bitrix_field TEXT,
  bitrix_field_type TEXT,
  transform_function TEXT,
  sync_active BOOLEAN DEFAULT false,
  sync_priority INTEGER DEFAULT 0,
  
  -- Configuração de UI (Gestão Scouter)
  display_name TEXT,
  category TEXT,
  field_type TEXT DEFAULT 'string',
  default_visible BOOLEAN DEFAULT false,
  sortable BOOLEAN DEFAULT true,
  ui_priority INTEGER DEFAULT 0,
  formatter_function TEXT,
  ui_active BOOLEAN DEFAULT false,
  
  -- Controle geral
  is_hidden BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Comentários na tabela
COMMENT ON TABLE public.unified_field_config IS 'Configuração unificada de campos - substitui bitrix_field_mappings e gestao_scouter_field_mappings';
COMMENT ON COLUMN public.unified_field_config.supabase_field IS 'Nome do campo na tabela leads do Supabase';
COMMENT ON COLUMN public.unified_field_config.sync_active IS 'Campo ativo para sincronização com Bitrix';
COMMENT ON COLUMN public.unified_field_config.ui_active IS 'Campo ativo para exibição no módulo Gestão Scouter';
COMMENT ON COLUMN public.unified_field_config.is_hidden IS 'Campo marcado como oculto da visualização';

-- FASE 1: Migrar dados de bitrix_field_mappings (removendo duplicatas)
WITH deduplicated_bitrix AS (
  SELECT DISTINCT ON (tabuladormax_field)
    tabuladormax_field,
    tabuladormax_field_type,
    bitrix_field,
    bitrix_field_type,
    transform_function,
    COALESCE(active, false) as active,
    COALESCE(priority, 0) as priority,
    notes,
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at
  FROM bitrix_field_mappings
  ORDER BY tabuladormax_field, priority DESC, updated_at DESC
)
INSERT INTO public.unified_field_config (
  supabase_field,
  supabase_type,
  bitrix_field,
  bitrix_field_type,
  transform_function,
  sync_active,
  sync_priority,
  notes,
  created_at,
  updated_at
)
SELECT 
  tabuladormax_field,
  tabuladormax_field_type,
  bitrix_field,
  bitrix_field_type,
  transform_function,
  active,
  priority,
  notes,
  created_at,
  updated_at
FROM deduplicated_bitrix;

-- FASE 2: Mesclar dados de gestao_scouter_field_mappings
-- 2A: UPDATE para campos que já existem
WITH deduplicated_gestao AS (
  SELECT DISTINCT ON (database_field)
    database_field,
    display_name,
    category,
    field_type,
    COALESCE(default_visible, false) as default_visible,
    COALESCE(sortable, true) as sortable,
    COALESCE(priority, 0) as priority,
    formatter_function,
    COALESCE(active, false) as active,
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at,
    created_by,
    updated_by
  FROM gestao_scouter_field_mappings
  ORDER BY database_field, priority DESC, updated_at DESC
)
UPDATE public.unified_field_config ufc
SET 
  display_name = dg.display_name,
  category = dg.category,
  field_type = dg.field_type,
  default_visible = dg.default_visible,
  sortable = dg.sortable,
  ui_priority = dg.priority,
  formatter_function = dg.formatter_function,
  ui_active = dg.active,
  created_by = dg.created_by,
  updated_by = dg.updated_by
FROM deduplicated_gestao dg
WHERE ufc.supabase_field = dg.database_field;

-- 2B: INSERT para campos novos que só existem em gestao_scouter_field_mappings
WITH deduplicated_gestao AS (
  SELECT DISTINCT ON (database_field)
    database_field,
    display_name,
    category,
    field_type,
    COALESCE(default_visible, false) as default_visible,
    COALESCE(sortable, true) as sortable,
    COALESCE(priority, 0) as priority,
    formatter_function,
    COALESCE(active, false) as active,
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at,
    created_by,
    updated_by
  FROM gestao_scouter_field_mappings
  ORDER BY database_field, priority DESC, updated_at DESC
)
INSERT INTO public.unified_field_config (
  supabase_field,
  display_name,
  category,
  field_type,
  default_visible,
  sortable,
  ui_priority,
  formatter_function,
  ui_active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT 
  dg.database_field,
  dg.display_name,
  dg.category,
  dg.field_type,
  dg.default_visible,
  dg.sortable,
  dg.priority,
  dg.formatter_function,
  dg.active,
  dg.created_at,
  dg.updated_at,
  dg.created_by,
  dg.updated_by
FROM deduplicated_gestao dg
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_field_config ufc
  WHERE ufc.supabase_field = dg.database_field
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_unified_supabase_field ON public.unified_field_config(supabase_field);
CREATE INDEX IF NOT EXISTS idx_unified_bitrix_field ON public.unified_field_config(bitrix_field) WHERE bitrix_field IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_sync_active ON public.unified_field_config(sync_active) WHERE sync_active = true;
CREATE INDEX IF NOT EXISTS idx_unified_ui_active ON public.unified_field_config(ui_active) WHERE ui_active = true;
CREATE INDEX IF NOT EXISTS idx_unified_is_hidden ON public.unified_field_config(is_hidden) WHERE is_hidden = true;
CREATE INDEX IF NOT EXISTS idx_unified_category ON public.unified_field_config(category);

-- Habilitar Row Level Security
ALTER TABLE public.unified_field_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Todos podem visualizar configurações"
  ON public.unified_field_config FOR SELECT
  USING (true);

CREATE POLICY "Admins e managers podem gerenciar configurações"
  ON public.unified_field_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger de updated_at
CREATE TRIGGER update_unified_field_config_updated_at
  BEFORE UPDATE ON public.unified_field_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de logging de mudanças
CREATE TRIGGER log_unified_field_config_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.unified_field_config
  FOR EACH ROW
  EXECUTE FUNCTION public.log_field_mapping_change();