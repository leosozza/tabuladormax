-- ============================================
-- Flow Builder MVP - Database Tables
-- ============================================
-- Idempotent migration to create flows and flows_runs tables
-- with RLS policies, triggers, and indexes

-- Create flows table if not exists
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT flows_steps_is_array CHECK (jsonb_typeof(steps) = 'array')
);

-- Create flows_runs table if not exists
CREATE TABLE IF NOT EXISTS public.flows_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  lead_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  logs JSONB DEFAULT '[]'::jsonb,
  resultado JSONB,
  iniciado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finalizado_em TIMESTAMP WITH TIME ZONE,
  executado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT flows_runs_logs_is_array CHECK (jsonb_typeof(logs) = 'array')
);

-- Enable RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows_runs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flows_ativo ON public.flows(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_flows_criado_por ON public.flows(criado_por);
CREATE INDEX IF NOT EXISTS idx_flows_runs_flow_id ON public.flows_runs(flow_id);
CREATE INDEX IF NOT EXISTS idx_flows_runs_lead_id ON public.flows_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_flows_runs_status ON public.flows_runs(status);
CREATE INDEX IF NOT EXISTS idx_flows_runs_executado_por ON public.flows_runs(executado_por);

-- Create or replace trigger function for atualizado_em
CREATE OR REPLACE FUNCTION public.update_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Create trigger for flows table (drop if exists to make idempotent)
DROP TRIGGER IF EXISTS set_atualizado_em ON public.flows;
CREATE TRIGGER set_atualizado_em
  BEFORE UPDATE ON public.flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atualizado_em();

-- RLS Policies for flows table
-- Drop existing policies to make idempotent
DROP POLICY IF EXISTS "Users can view all active flows" ON public.flows;
DROP POLICY IF EXISTS "Authenticated users can view all flows" ON public.flows;
DROP POLICY IF EXISTS "Admins and managers can create flows" ON public.flows;
DROP POLICY IF EXISTS "Admins and managers can update flows" ON public.flows;
DROP POLICY IF EXISTS "Admins can delete flows" ON public.flows;

-- Create new policies
CREATE POLICY "Authenticated users can view all flows"
  ON public.flows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can create flows"
  ON public.flows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update flows"
  ON public.flows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete flows"
  ON public.flows FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policies for flows_runs table
DROP POLICY IF EXISTS "Users can view their own flow runs" ON public.flows_runs;
DROP POLICY IF EXISTS "Admins and managers can view all flow runs" ON public.flows_runs;
DROP POLICY IF EXISTS "Authenticated users can create flow runs" ON public.flows_runs;
DROP POLICY IF EXISTS "System can update flow runs" ON public.flows_runs;

CREATE POLICY "Users can view their own flow runs"
  ON public.flows_runs FOR SELECT
  TO authenticated
  USING (
    executado_por = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Authenticated users can create flow runs"
  ON public.flows_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update flow runs"
  ON public.flows_runs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.flows TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.flows_runs TO authenticated;
GRANT DELETE ON public.flows TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.flows IS 'Stores flow definitions with sequential steps for automation';
COMMENT ON TABLE public.flows_runs IS 'Stores execution history and logs for flow runs';
COMMENT ON COLUMN public.flows.steps IS 'Array of step objects defining the flow sequence';
COMMENT ON COLUMN public.flows_runs.logs IS 'Array of log entries from flow execution';
COMMENT ON COLUMN public.flows_runs.resultado IS 'Final result or output data from flow execution';
