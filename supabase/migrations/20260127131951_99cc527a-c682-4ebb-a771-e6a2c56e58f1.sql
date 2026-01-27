-- Create flow_scheduled_actions table for scheduling future flow executions
CREATE TABLE public.flow_scheduled_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE,
  run_id uuid,
  step_id text NOT NULL,
  lead_id bigint,
  phone_number text,
  scheduled_for timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'failed')),
  target_flow_id uuid REFERENCES public.flows(id),
  target_step_id text,
  context jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  executed_at timestamp with time zone,
  error_message text
);

-- Create indexes for efficient querying
CREATE INDEX idx_flow_scheduled_actions_pending ON flow_scheduled_actions(scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX idx_flow_scheduled_actions_phone ON flow_scheduled_actions(phone_number);
CREATE INDEX idx_flow_scheduled_actions_lead ON flow_scheduled_actions(lead_id);

-- Enable RLS
ALTER TABLE public.flow_scheduled_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users (internal system table)
CREATE POLICY "Allow authenticated read" ON public.flow_scheduled_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON public.flow_scheduled_actions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON public.flow_scheduled_actions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete" ON public.flow_scheduled_actions
  FOR DELETE TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON public.flow_scheduled_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.flow_scheduled_actions IS 'Stores scheduled flow actions for future execution based on dates or lead fields';