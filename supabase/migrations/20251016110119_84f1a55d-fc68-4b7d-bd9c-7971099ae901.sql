-- Adicionar colunas para armazenar dados do responsável e telemarketing do Bitrix
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS bitrix_telemarketing_id integer;

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_leads_responsible_user ON public.leads(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_bitrix_telemarketing ON public.leads(bitrix_telemarketing_id);

-- Comentários para documentação
COMMENT ON COLUMN public.leads.responsible_user_id IS 'ID do usuário responsável pelo lead no TabuladorMax';
COMMENT ON COLUMN public.leads.bitrix_telemarketing_id IS 'ID do telemarketing no Bitrix24';