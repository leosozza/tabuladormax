-- Create webhook logs table for Bitrix24 integration
-- This table helps with troubleshooting and monitoring webhook synchronization

CREATE TABLE IF NOT EXISTS public.bitrix_webhook_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT,
    bitrix_id INTEGER,
    payload JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bitrix_webhook_logs_created ON public.bitrix_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bitrix_webhook_logs_bitrix_id ON public.bitrix_webhook_logs(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_bitrix_webhook_logs_success ON public.bitrix_webhook_logs(success);
CREATE INDEX IF NOT EXISTS idx_bitrix_webhook_logs_event_type ON public.bitrix_webhook_logs(event_type);

-- Enable Row Level Security
ALTER TABLE public.bitrix_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow viewing logs
CREATE POLICY "Users can view all webhook logs" 
ON public.bitrix_webhook_logs 
FOR SELECT 
USING (true);

-- Create policy for service role to insert logs
CREATE POLICY "Service role can insert webhook logs" 
ON public.bitrix_webhook_logs 
FOR INSERT 
WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.bitrix_webhook_logs IS 'Logs of Bitrix24 webhook events for monitoring and troubleshooting';
COMMENT ON COLUMN public.bitrix_webhook_logs.event_type IS 'Type of Bitrix24 event (ONCRMLEADADD, ONCRMLEADUPDATE, etc.)';
COMMENT ON COLUMN public.bitrix_webhook_logs.bitrix_id IS 'ID of the lead in Bitrix24';
COMMENT ON COLUMN public.bitrix_webhook_logs.payload IS 'Full webhook payload received from Bitrix24';
COMMENT ON COLUMN public.bitrix_webhook_logs.success IS 'Whether the webhook was processed successfully';
COMMENT ON COLUMN public.bitrix_webhook_logs.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN public.bitrix_webhook_logs.processing_time_ms IS 'Time taken to process the webhook in milliseconds';
