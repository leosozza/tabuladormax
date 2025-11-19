-- Renomear coluna bitrix_telemarketing_name para telemarketing
ALTER TABLE public.leads 
RENAME COLUMN bitrix_telemarketing_name TO telemarketing;

-- Atualizar comentário
COMMENT ON COLUMN public.leads.telemarketing IS 'Nome do Telemarketing (PARENT_ID_1144 resolvido)';

-- Atualizar unified_field_config
UPDATE public.unified_field_config
SET 
  supabase_field = 'telemarketing',
  display_name = 'Telemarketing'
WHERE supabase_field = 'bitrix_telemarketing_name';