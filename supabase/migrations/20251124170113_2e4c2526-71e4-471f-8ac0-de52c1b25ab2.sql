-- Create lead_search_cache table to avoid repeatedly searching for non-existent leads
CREATE TABLE IF NOT EXISTS public.lead_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id INTEGER NOT NULL UNIQUE,
  found BOOLEAN NOT NULL,
  last_search TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT,
  source TEXT, -- 'supabase' or 'bitrix'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_search_cache_lead_id ON public.lead_search_cache(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_search_cache_last_search ON public.lead_search_cache(last_search);

-- Enable RLS
ALTER TABLE public.lead_search_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read lead search cache"
  ON public.lead_search_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert lead search cache"
  ON public.lead_search_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update lead search cache"
  ON public.lead_search_cache
  FOR UPDATE
  TO authenticated
  USING (true);

-- Function to clean old negative cache entries (older than 1 hour)
CREATE OR REPLACE FUNCTION clean_old_lead_search_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.lead_search_cache
  WHERE found = false 
    AND last_search < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;