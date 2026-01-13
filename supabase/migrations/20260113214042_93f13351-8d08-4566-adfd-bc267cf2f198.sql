
-- Adicionar campo cargo_id na tabela agent_telemarketing_mapping para armazenar o cargo do Bitrix
-- 10620 = Supervisor, 10626 = Supervisor Adjunto, 10627 = Control Desk

ALTER TABLE public.agent_telemarketing_mapping 
ADD COLUMN IF NOT EXISTS cargo_id text;

-- Criar índice para consultas por cargo
CREATE INDEX IF NOT EXISTS idx_agent_telemarketing_mapping_cargo_id 
ON public.agent_telemarketing_mapping(cargo_id);

-- Comentário explicativo
COMMENT ON COLUMN public.agent_telemarketing_mapping.cargo_id IS 'ID do cargo do Bitrix: 10620=Supervisor, 10626=Supervisor Adj, 10627=Control Desk, NULL=Agent';

-- Atualizar a Amanda Goes para ter cargo_id = 10626 (Supervisor Adjunto)
UPDATE public.agent_telemarketing_mapping 
SET cargo_id = '10626'
WHERE bitrix_telemarketing_id = 228;

-- Atualizar a Vitória Amorin para ter cargo_id = 10620 (Supervisor)
UPDATE public.agent_telemarketing_mapping 
SET cargo_id = '10620'
WHERE bitrix_telemarketing_id = 242;
