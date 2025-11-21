-- Adicionar coluna nome_responsavel_legal na tabela leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nome_responsavel_legal TEXT;

-- Comentário na coluna
COMMENT ON COLUMN public.leads.nome_responsavel_legal IS 'Nome do responsável legal (pai/mãe) do modelo - UF_CRM_1744900570916';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_leads_nome_responsavel_legal ON public.leads(nome_responsavel_legal);

-- Inserir/atualizar mapeamento no unified_field_config
INSERT INTO public.unified_field_config (
  supabase_field,
  bitrix_field,
  display_name,
  field_type,
  category,
  bitrix_field_type,
  sync_active,
  sync_priority,
  ui_active,
  default_visible,
  sortable,
  notes
) VALUES (
  'nome_responsavel_legal',
  'UF_CRM_1744900570916',
  'Responsável Legal',
  'string',
  'identificacao',
  'string',
  true,
  50,
  true,
  true,
  true,
  'Nome do responsável legal (pai/mãe) do modelo'
)
ON CONFLICT (supabase_field) 
DO UPDATE SET
  bitrix_field = EXCLUDED.bitrix_field,
  display_name = EXCLUDED.display_name,
  sync_active = EXCLUDED.sync_active,
  sync_priority = EXCLUDED.sync_priority,
  ui_active = EXCLUDED.ui_active,
  updated_at = now();