-- Criar trigger para atualizar updated_at automaticamente na tabela leads
-- A função update_updated_at_column() já existe no banco

-- Drop trigger se existir (para evitar duplicação)
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;

-- Criar trigger
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Garantir que updated_at tem valor padrão
ALTER TABLE public.leads 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Criar índice se não existir (para melhor performance em queries de sincronização)
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

COMMENT ON TRIGGER set_updated_at ON public.leads IS 
'Atualiza automaticamente o campo updated_at sempre que um lead é modificado';