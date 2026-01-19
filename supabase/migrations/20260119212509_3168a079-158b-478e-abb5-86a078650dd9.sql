-- Add new columns for staged sync and heartbeat tracking
ALTER TABLE public.missing_leads_sync_jobs 
ADD COLUMN IF NOT EXISTS stage text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS cursor_start integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS scanned_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.missing_leads_sync_jobs.stage IS 'Current stage: pending, listing_bitrix, comparing, importing, completed, failed, cancelled';
COMMENT ON COLUMN public.missing_leads_sync_jobs.cursor_start IS 'Bitrix pagination cursor (start parameter)';
COMMENT ON COLUMN public.missing_leads_sync_jobs.scanned_count IS 'Number of Bitrix IDs scanned so far';
COMMENT ON COLUMN public.missing_leads_sync_jobs.last_heartbeat_at IS 'Last time the job was updated by the function';