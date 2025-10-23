-- Alterar campo 'aprovado' para permitir NULL e rastrear status de análise
-- NULL = não analisado
-- true = aprovado
-- false = reprovado

-- Primeiro, remover o default false para novos registros
ALTER TABLE public.fichas 
ALTER COLUMN aprovado DROP DEFAULT;

-- Atualizar registros existentes com aprovado = false para NULL (não analisado)
-- Isso assume que os registros atuais ainda não foram analisados
UPDATE public.fichas 
SET aprovado = NULL 
WHERE aprovado = false;

-- Adicionar novo default como NULL para futuros registros
ALTER TABLE public.fichas 
ALTER COLUMN aprovado SET DEFAULT NULL;

-- Atualizar comentário
COMMENT ON COLUMN public.fichas.aprovado IS 'Status de análise Tinder: NULL = não analisado, true = aprovado, false = reprovado';
