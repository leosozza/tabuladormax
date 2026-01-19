-- Índices para acelerar UPSERTs e buscas na tabela leads
CREATE INDEX IF NOT EXISTS idx_leads_id_upsert ON public.leads(id);
CREATE INDEX IF NOT EXISTS idx_leads_scouter_fonte ON public.leads(scouter, fonte) WHERE fonte = 'Scouter - Fichas';
CREATE INDEX IF NOT EXISTS idx_leads_scouter_criado ON public.leads(scouter, criado DESC);
CREATE INDEX IF NOT EXISTS idx_leads_bitrix_telemarketing ON public.leads(bitrix_telemarketing_id);

-- Analisar tabela para otimizar plano de queries
ANALYZE public.leads;