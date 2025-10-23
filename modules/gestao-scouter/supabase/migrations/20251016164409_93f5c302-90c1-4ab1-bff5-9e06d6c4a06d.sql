-- Criar tabela para configurações de indicadores do dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_indicator_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_key text NOT NULL,
  title text NOT NULL,
  source_column text NOT NULL,
  aggregation text NOT NULL DEFAULT 'count',
  filter_condition jsonb DEFAULT '{}',
  chart_type text DEFAULT 'number',
  format text DEFAULT 'number',
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, indicator_key)
);

-- Enable RLS
ALTER TABLE public.dashboard_indicator_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own configs"
  ON public.dashboard_indicator_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configs"
  ON public.dashboard_indicator_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configs"
  ON public.dashboard_indicator_configs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own configs"
  ON public.dashboard_indicator_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_dashboard_indicator_configs_updated_at
  BEFORE UPDATE ON public.dashboard_indicator_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();