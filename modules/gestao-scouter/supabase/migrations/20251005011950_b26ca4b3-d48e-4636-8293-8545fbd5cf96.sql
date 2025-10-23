-- Create webhook_logs table for logging webhook requests
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payload JSONB,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read logs
CREATE POLICY "Authenticated users can view webhook logs"
  ON public.webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert logs (edge functions)
CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to delete logs
CREATE POLICY "Authenticated users can delete webhook logs"
  ON public.webhook_logs
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON public.webhook_logs(source);