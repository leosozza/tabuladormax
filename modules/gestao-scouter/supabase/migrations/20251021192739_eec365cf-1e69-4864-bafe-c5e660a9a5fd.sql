-- Adicionar colunas de sincronização na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ultima_sincronizacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS origem_sincronizacao TEXT,
ADD COLUMN IF NOT EXISTS modificado TIMESTAMPTZ;

-- Criar índices para otimizar queries de sincronização
CREATE INDEX IF NOT EXISTS idx_leads_ultima_sincronizacao 
ON public.leads(ultima_sincronizacao DESC);

CREATE INDEX IF NOT EXISTS idx_leads_origem_sincronizacao 
ON public.leads(origem_sincronizacao);

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';