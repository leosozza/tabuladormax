-- FASE 1: Adicionar campos necessários
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS projeto_comercial text,
ADD COLUMN IF NOT EXISTS bitrix_telemarketing_name text;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_projeto_comercial 
ON public.leads(projeto_comercial);

CREATE INDEX IF NOT EXISTS idx_leads_bitrix_telemarketing_name 
ON public.leads(bitrix_telemarketing_name);

-- Comentários
COMMENT ON COLUMN public.leads.projeto_comercial IS 'Nome do Projeto Comercial (PARENT_ID_1120 resolvido)';
COMMENT ON COLUMN public.leads.bitrix_telemarketing_name IS 'Nome do Telemarketing (PARENT_ID_1144 resolvido)';
COMMENT ON COLUMN public.leads.scouter IS 'Nome do Scouter (PARENT_ID_1096 resolvido)';
COMMENT ON COLUMN public.leads.gestao_scouter IS 'Nome do Scouter para Gestão (PARENT_ID_1096 resolvido)';

-- FASE 4: Adicionar mapeamentos em unified_field_config
INSERT INTO public.unified_field_config (
  supabase_field,
  display_name,
  category,
  field_type,
  bitrix_field,
  bitrix_field_type,
  sync_active,
  sync_priority,
  ui_active,
  ui_priority,
  default_visible,
  sortable,
  notes
) VALUES
('bitrix_telemarketing_name', 'Nome do Telemarketing', 'gestao', 'string', 'PARENT_ID_1144', 'crm_entity', true, 11, true, 11, true, true, 'Nome do Telemarketing resolvido via bitrix_spa_entities'),
('projeto_comercial', 'Projeto Comercial', 'gestao', 'string', 'PARENT_ID_1120', 'crm_entity', true, 12, true, 12, true, true, 'Nome do Projeto Comercial resolvido via bitrix_spa_entities'),
('scouter', 'Scouter', 'gestao', 'string', 'PARENT_ID_1096', 'crm_entity', true, 10, true, 10, true, true, 'Nome do Scouter resolvido via bitrix_spa_entities'),
('gestao_scouter', 'Gestão de Scouter', 'gestao', 'string', 'PARENT_ID_1096', 'crm_entity', true, 10, true, 10, true, true, 'Nome do Scouter resolvido via bitrix_spa_entities')
ON CONFLICT (supabase_field) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bitrix_field = EXCLUDED.bitrix_field,
  sync_active = EXCLUDED.sync_active;

-- FASE 3: Atualizar leads existentes (dados retroativos)
-- Atualizar nomes de Scouters existentes
UPDATE public.leads l
SET 
  scouter = spa.title,
  gestao_scouter = spa.title
FROM bitrix_spa_entities spa
WHERE spa.entity_type_id = 1096
  AND spa.bitrix_item_id::text = l.gestao_scouter
  AND l.gestao_scouter ~ '^\d+$'
  AND (l.scouter IS NULL OR l.scouter ~ '^\d+$');

-- Atualizar nomes de Telemarketing existentes  
UPDATE public.leads l
SET bitrix_telemarketing_name = spa.title
FROM bitrix_spa_entities spa
WHERE spa.entity_type_id = 1144
  AND spa.bitrix_item_id = l.bitrix_telemarketing_id
  AND (l.bitrix_telemarketing_name IS NULL OR l.bitrix_telemarketing_name ~ '^\d+$');

-- Atualizar nomes de Projetos Comerciais existentes (via raw JSONB)
UPDATE public.leads l
SET projeto_comercial = spa.title
FROM bitrix_spa_entities spa
WHERE spa.entity_type_id = 1120
  AND spa.bitrix_item_id = (l.raw->>'PARENT_ID_1120')::integer
  AND l.projeto_comercial IS NULL;