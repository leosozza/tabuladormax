-- Performance Optimization Indexes for Leads Table
-- This migration adds indexes to improve query performance for lead analysis

-- Index on qualidade_lead for filtering pending analysis
CREATE INDEX IF NOT EXISTS idx_leads_qualidade_lead 
ON public.leads(qualidade_lead) 
WHERE qualidade_lead IS NULL;

-- Composite index for date range queries with quality filter
CREATE INDEX IF NOT EXISTS idx_leads_criado_qualidade 
ON public.leads(criado DESC, qualidade_lead);

-- Index for project filtering
CREATE INDEX IF NOT EXISTS idx_leads_commercial_project_id 
ON public.leads(commercial_project_id) 
WHERE commercial_project_id IS NOT NULL;

-- Index for scouter filtering
CREATE INDEX IF NOT EXISTS idx_leads_scouter 
ON public.leads(scouter) 
WHERE scouter IS NOT NULL;

-- Index for etapa filtering
CREATE INDEX IF NOT EXISTS idx_leads_etapa 
ON public.leads(etapa) 
WHERE etapa IS NOT NULL;

-- Composite index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_leads_geo 
ON public.leads(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for analysis tracking
CREATE INDEX IF NOT EXISTS idx_leads_analisado_por_data 
ON public.leads(analisado_por, data_analise DESC) 
WHERE analisado_por IS NOT NULL;

-- Comment for documentation
COMMENT ON INDEX idx_leads_qualidade_lead IS 'Partial index for pending lead analysis queries';
COMMENT ON INDEX idx_leads_criado_qualidade IS 'Composite index for date-filtered analysis queries';
COMMENT ON INDEX idx_leads_commercial_project_id IS 'Index for project-based filtering';
COMMENT ON INDEX idx_leads_scouter IS 'Index for scouter-based filtering';
COMMENT ON INDEX idx_leads_etapa IS 'Index for stage-based filtering';
COMMENT ON INDEX idx_leads_geo IS 'Composite index for geolocation queries';
COMMENT ON INDEX idx_leads_analisado_por_data IS 'Index for tracking analyst performance';
