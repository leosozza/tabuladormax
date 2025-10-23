-- Adicionar colunas para análise de leads (sistema Tinder)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS qualidade_lead TEXT,
ADD COLUMN IF NOT EXISTS analisado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS data_analise TIMESTAMPTZ;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_qualidade ON public.leads(qualidade_lead);
CREATE INDEX IF NOT EXISTS idx_leads_analisado_por ON public.leads(analisado_por);
CREATE INDEX IF NOT EXISTS idx_leads_data_analise ON public.leads(data_analise);

-- Comentários para documentação
COMMENT ON COLUMN public.leads.qualidade_lead IS 'Qualidade do lead: aprovado, rejeitado, ou NULL se não analisado';
COMMENT ON COLUMN public.leads.analisado_por IS 'ID do usuário que analisou o lead';
COMMENT ON COLUMN public.leads.data_analise IS 'Data e hora da análise do lead';