-- Cache dos leads do Bitrix24
CREATE TABLE IF NOT EXISTS public.leads (
  id BIGINT PRIMARY KEY,
  name TEXT,
  responsible TEXT,
  age INTEGER,
  address TEXT,
  scouter TEXT,
  photo_url TEXT,
  date_modify TIMESTAMPTZ,
  raw JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads são acessíveis por todos autenticados"
  ON public.leads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Configuração dos botões (com categorias, posições e sub-botões)
CREATE TABLE IF NOT EXISTS public.button_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  category TEXT CHECK (category IN ('NAO_AGENDADO','RETORNAR','AGENDAR')) DEFAULT 'NAO_AGENDADO',
  hotkey TEXT,
  field TEXT NOT NULL,
  value TEXT,
  field_type TEXT CHECK (field_type IN ('string','number','datetime','boolean')) DEFAULT 'string',
  action_type TEXT CHECK (action_type IN ('simple','schedule')) DEFAULT 'simple',
  sort INTEGER DEFAULT 100,
  pos JSONB DEFAULT '{"x":0,"y":0,"w":1,"h":1}',
  sub_buttons JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.button_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Botões são acessíveis por todos autenticados"
  ON public.button_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Logs de ações
CREATE TABLE IF NOT EXISTS public.actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id BIGINT NOT NULL,
  action_label TEXT,
  payload JSONB,
  status TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logs são acessíveis por todos autenticados"
  ON public.actions_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Logs de ligações (opcional, para integração com discador)
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id BIGINT NOT NULL,
  recording_url TEXT,
  duration_sec INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  agent TEXT,
  disposition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ligações são acessíveis por todos autenticados"
  ON public.call_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Configurações gerais (KV store)
CREATE TABLE IF NOT EXISTS public.config_kv (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.config_kv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configs são acessíveis por todos autenticados"
  ON public.config_kv FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Dados de exemplo para botões
INSERT INTO public.button_config (label, color, category, hotkey, field, value, action_type, sort) VALUES
  ('Não atende', '#ef4444', 'NAO_AGENDADO', '1', 'STATUS_ID', 'NAO_ATENDE', 'simple', 1),
  ('Telefone inválido', '#dc2626', 'NAO_AGENDADO', '2', 'STATUS_ID', 'TEL_INVALIDO', 'simple', 2),
  ('Retornar amanhã', '#f59e0b', 'RETORNAR', '3', 'STATUS_ID', 'RETORNAR', 'simple', 3),
  ('Agendar teste', '#10b981', 'AGENDAR', '4', 'UF_CRM_DATA_AGENDAMENTO', '', 'schedule', 4)
ON CONFLICT (id) DO NOTHING;