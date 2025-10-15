-- Adicionar coluna para armazenar ID do agente no Chatwoot
ALTER TABLE public.agent_telemarketing_mapping 
ADD COLUMN chatwoot_agent_id INTEGER;

-- Comentário explicativo
COMMENT ON COLUMN public.agent_telemarketing_mapping.chatwoot_agent_id 
IS 'ID do agente no Chatwoot (usado para sincronização)';