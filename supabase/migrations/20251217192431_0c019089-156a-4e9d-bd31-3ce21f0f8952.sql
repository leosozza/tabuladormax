-- Tabela de flows (automações)
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Tabela de triggers (gatilhos)
CREATE TABLE public.flow_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE,
  trigger_type text NOT NULL, -- 'button_click', 'keyword', 'webhook'
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de execuções (histórico)
CREATE TABLE public.flows_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE SET NULL,
  lead_id bigint,
  phone_number text,
  trigger_type text,
  trigger_value text,
  status text DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  logs jsonb DEFAULT '[]'::jsonb,
  resultado jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  executed_by uuid REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_flows_ativo ON public.flows(ativo);
CREATE INDEX idx_flow_triggers_flow_id ON public.flow_triggers(flow_id);
CREATE INDEX idx_flow_triggers_type ON public.flow_triggers(trigger_type, ativo);
CREATE INDEX idx_flows_runs_flow_id ON public.flows_runs(flow_id);
CREATE INDEX idx_flows_runs_status ON public.flows_runs(status);
CREATE INDEX idx_flows_runs_started_at ON public.flows_runs(started_at DESC);

-- Enable RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies para flows
CREATE POLICY "Admins and managers can manage flows" ON public.flows
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view active flows" ON public.flows
  FOR SELECT USING (ativo = true);

-- RLS Policies para flow_triggers
CREATE POLICY "Admins and managers can manage triggers" ON public.flow_triggers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view active triggers" ON public.flow_triggers
  FOR SELECT USING (ativo = true);

-- RLS Policies para flows_runs
CREATE POLICY "Admins and managers can view all runs" ON public.flows_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "System can insert runs" ON public.flows_runs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update runs" ON public.flows_runs
  FOR UPDATE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flow_triggers_updated_at
  BEFORE UPDATE ON public.flow_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();