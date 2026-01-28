-- Adicionar campos de auto-resposta na tabela ai_agents
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS auto_respond_enabled BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS auto_respond_filters JSONB DEFAULT '{}';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS window_proactive_enabled BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS window_proactive_message TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS window_proactive_hours INTEGER DEFAULT 2;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS max_auto_responses_per_conversation INTEGER DEFAULT 10;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS auto_respond_cooldown_minutes INTEGER DEFAULT 5;

-- Tabela de log de auto-respostas
CREATE TABLE IF NOT EXISTS ai_auto_response_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  trigger_type TEXT NOT NULL,
  input_message TEXT,
  output_message TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_auto_response_phone_date ON ai_auto_response_log(phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_response_agent ON ai_auto_response_log(agent_id);

-- RLS
ALTER TABLE ai_auto_response_log ENABLE ROW LEVEL SECURITY;

-- Política para admins lerem logs
DROP POLICY IF EXISTS "Admins can read auto response log" ON ai_auto_response_log;
CREATE POLICY "Admins can read auto response log" ON ai_auto_response_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Política para edge functions inserirem logs (via service role)
DROP POLICY IF EXISTS "Service can insert auto response log" ON ai_auto_response_log;
CREATE POLICY "Service can insert auto response log" ON ai_auto_response_log
  FOR INSERT TO authenticated WITH CHECK (true);