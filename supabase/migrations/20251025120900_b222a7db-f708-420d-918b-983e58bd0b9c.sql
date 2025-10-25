-- Add sync fields to leads table for Bitrix integration
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- Add geolocation fields for maps functionality
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON public.leads(sync_status);
CREATE INDEX IF NOT EXISTS idx_leads_sync_source ON public.leads(sync_source);
CREATE INDEX IF NOT EXISTS idx_leads_location ON public.leads(latitude, longitude) WHERE latitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.leads.sync_source IS 'Source of lead: manual, bitrix, gestao_scouter, chatwoot';
COMMENT ON COLUMN public.leads.sync_status IS 'Sync status: pending, synced, error';
COMMENT ON COLUMN public.leads.latitude IS 'Latitude from geocoded address';
COMMENT ON COLUMN public.leads.longitude IS 'Longitude from geocoded address';
COMMENT ON COLUMN public.leads.geocoded_at IS 'When address was geocoded';