-- Criar tabela para configurações de dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios dashboards
CREATE POLICY "Users can view own dashboards"
ON public.dashboard_configs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Usuários podem criar seus próprios dashboards
CREATE POLICY "Users can create own dashboards"
ON public.dashboard_configs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar seus próprios dashboards
CREATE POLICY "Users can update own dashboards"
ON public.dashboard_configs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Usuários podem deletar seus próprios dashboards
CREATE POLICY "Users can delete own dashboards"
ON public.dashboard_configs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_dashboard_configs_updated_at
BEFORE UPDATE ON public.dashboard_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Criar índices para performance
CREATE INDEX idx_dashboard_configs_user_id ON public.dashboard_configs(user_id);
CREATE INDEX idx_dashboard_configs_is_default ON public.dashboard_configs(user_id, is_default) WHERE is_default = true;