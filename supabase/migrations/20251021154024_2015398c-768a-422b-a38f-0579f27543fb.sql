-- Migration: Adicionar trigger para atualizar updated_at automaticamente

-- Criar função que atualiza updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;

-- Criar trigger BEFORE UPDATE
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Popular updated_at para registros existentes sem valor
UPDATE public.leads
SET updated_at = COALESCE(
    updated_at,        -- Manter se já existe
    date_modify,       -- Usar data de modificação
    criado,            -- Ou data de criação
    NOW()              -- Ou timestamp atual
)
WHERE updated_at IS NULL;

-- Criar índice para performance na sincronização
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);