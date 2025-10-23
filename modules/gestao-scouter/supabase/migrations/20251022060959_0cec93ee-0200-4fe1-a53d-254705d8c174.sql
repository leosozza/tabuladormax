-- Adicionar coluna needs_enrichment à tabela leads
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS needs_enrichment BOOLEAN DEFAULT false;

-- Criar índice para otimizar busca de leads pendentes
CREATE INDEX IF NOT EXISTS idx_leads_needs_enrichment 
  ON leads(needs_enrichment) 
  WHERE needs_enrichment = true;

-- Comentário explicativo
COMMENT ON COLUMN leads.needs_enrichment IS 'Indica se o lead precisa de enriquecimento com dados do Bitrix24';