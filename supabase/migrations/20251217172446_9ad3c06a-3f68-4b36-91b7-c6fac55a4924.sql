-- Adicionar coluna para observações do telemarketing
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS observacoes_telemarketing TEXT;

COMMENT ON COLUMN public.leads.observacoes_telemarketing IS 'Observações do operador de telemarketing - sincroniza com Bitrix UF_CRM_1765991897';