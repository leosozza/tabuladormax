-- Garantir que updated_at existe e funciona corretamente na tabela leads

-- 1. Popular valores nulos de updated_at com fallback
UPDATE public.leads
SET updated_at = COALESCE(updated_at, date_modify, criado, NOW())
WHERE updated_at IS NULL;

-- 2. Criar índice para otimizar queries de sincronização
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

-- 3. Garantir que o trigger existe para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
