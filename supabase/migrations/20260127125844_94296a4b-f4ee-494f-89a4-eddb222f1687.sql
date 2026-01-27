-- Table to track flows waiting for button responses
CREATE TABLE public.flow_pending_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  step_id text NOT NULL,
  phone_number text NOT NULL,
  lead_id integer,
  context jsonb DEFAULT '{}',
  buttons jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  responded_at timestamptz,
  response_button_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'expired', 'cancelled'))
);

-- Index for fast lookup when webhook arrives
CREATE INDEX idx_flow_pending_phone ON public.flow_pending_responses(phone_number, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.flow_pending_responses ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage pending responses"
ON public.flow_pending_responses
FOR ALL
USING (true);

COMMENT ON TABLE public.flow_pending_responses IS 'Tracks flows paused waiting for template button click';