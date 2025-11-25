-- Tabela de configuração do Syscall
CREATE TABLE IF NOT EXISTS public.syscall_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL DEFAULT 'http://maxfama.syscall.com.br/crm',
  api_token TEXT,
  default_route TEXT DEFAULT '9',
  callback_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Tabela de campanhas do Syscall
CREATE TABLE IF NOT EXISTS public.syscall_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syscall_campaign_id INTEGER,
  nome TEXT NOT NULL,
  rota TEXT DEFAULT '9',
  agressividade INTEGER DEFAULT 2,
  status TEXT DEFAULT 'criada',
  operadores TEXT[],
  leads_enviados INTEGER DEFAULT 0,
  leads_discados INTEGER DEFAULT 0,
  leads_atendidos INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de leads por campanha
CREATE TABLE IF NOT EXISTS public.syscall_campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES syscall_campaigns(id) ON DELETE CASCADE,
  lead_id BIGINT NOT NULL,
  telefone TEXT NOT NULL,
  syscall_id TEXT,
  status TEXT DEFAULT 'enviado',
  discado_em TIMESTAMPTZ,
  atendido_em TIMESTAMPTZ,
  tabulado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de gravações de chamadas
CREATE TABLE IF NOT EXISTS public.lead_call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id BIGINT NOT NULL,
  campaign_id UUID REFERENCES syscall_campaigns(id),
  syscall_call_id TEXT,
  duration_seconds INTEGER,
  recording_url TEXT,
  recording_path TEXT,
  result TEXT,
  tabulacao TEXT,
  agent_id UUID,
  agent_code TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de mapeamento de agentes
CREATE TABLE IF NOT EXISTS public.syscall_agent_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  agent_code TEXT NOT NULL,
  ramal TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração inicial
INSERT INTO public.syscall_config (api_url) 
VALUES ('http://maxfama.syscall.com.br/crm')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.syscall_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syscall_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syscall_campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syscall_agent_mappings ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar configuração
CREATE POLICY "Admins podem gerenciar config"
  ON public.syscall_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Usuários podem ver campanhas
CREATE POLICY "Usuários podem ver campanhas"
  ON public.syscall_campaigns
  FOR SELECT
  USING (true);

-- Managers e admins podem gerenciar campanhas
CREATE POLICY "Managers podem gerenciar campanhas"
  ON public.syscall_campaigns
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Usuários podem ver leads de campanhas
CREATE POLICY "Usuários podem ver campaign leads"
  ON public.syscall_campaign_leads
  FOR SELECT
  USING (true);

-- Service role pode gerenciar campaign leads
CREATE POLICY "Service role pode gerenciar campaign leads"
  ON public.syscall_campaign_leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Usuários podem ver gravações
CREATE POLICY "Usuários podem ver gravações"
  ON public.lead_call_records
  FOR SELECT
  USING (true);

-- Service role pode gerenciar gravações
CREATE POLICY "Service role pode gerenciar gravações"
  ON public.lead_call_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Usuários podem ver seus mapeamentos
CREATE POLICY "Usuários podem ver seus mapeamentos"
  ON public.syscall_agent_mappings
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins podem gerenciar mapeamentos
CREATE POLICY "Admins podem gerenciar mapeamentos"
  ON public.syscall_agent_mappings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_syscall_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER syscall_config_updated_at
  BEFORE UPDATE ON public.syscall_config
  FOR EACH ROW
  EXECUTE FUNCTION update_syscall_config_updated_at();

CREATE TRIGGER syscall_campaigns_updated_at
  BEFORE UPDATE ON public.syscall_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();