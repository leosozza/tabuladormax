-- Add 'aprovado' field to fichas table for Tinder-style lead analysis
-- Default: false (not approved)

ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS aprovado BOOLEAN DEFAULT false;

-- Add index for performance when filtering by aprovado status
CREATE INDEX IF NOT EXISTS idx_fichas_aprovado ON public.fichas(aprovado);

-- Add comment for documentation
COMMENT ON COLUMN public.fichas.aprovado IS 'Indica se o lead foi aprovado na análise estilo Tinder';
