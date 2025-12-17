-- Tabela de configuração do bot por projeto comercial
CREATE TABLE public.whatsapp_bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_project_id UUID REFERENCES commercial_projects(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  bot_name TEXT DEFAULT 'Assistente MAX',
  personality TEXT DEFAULT 'amigavel',
  welcome_message TEXT DEFAULT 'Olá! Sou o assistente virtual. Como posso ajudá-lo?',
  fallback_message TEXT DEFAULT 'Desculpe, não entendi. Vou transferir você para um atendente.',
  transfer_keywords TEXT[] DEFAULT ARRAY['atendente', 'humano', 'pessoa', 'reclamação', 'cancelar'],
  operating_hours JSONB DEFAULT '{"start": "08:00", "end": "18:00", "timezone": "America/Sao_Paulo", "workDays": [1,2,3,4,5]}'::jsonb,
  max_messages_before_transfer INTEGER DEFAULT 10,
  response_delay_ms INTEGER DEFAULT 1500,
  collect_lead_data BOOLEAN DEFAULT true,
  auto_qualify BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(commercial_project_id)
);

-- Tabela de conversas do bot (histórico e métricas)
CREATE TABLE public.whatsapp_bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_project_id UUID REFERENCES commercial_projects(id),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  conversation_id INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'completed', 'abandoned')),
  messages_count INTEGER DEFAULT 0,
  bot_messages_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ,
  transferred_reason TEXT,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  resolved_by_bot BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de mensagens do bot (para análise)
CREATE TABLE public.whatsapp_bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_bot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar commercial_project_id à tabela de treinamento existente
ALTER TABLE public.ai_training_instructions 
ADD COLUMN IF NOT EXISTS commercial_project_id UUID REFERENCES commercial_projects(id);

-- Índices para performance
CREATE INDEX idx_bot_config_project ON whatsapp_bot_config(commercial_project_id);
CREATE INDEX idx_bot_conversations_project ON whatsapp_bot_conversations(commercial_project_id);
CREATE INDEX idx_bot_conversations_phone ON whatsapp_bot_conversations(phone_number);
CREATE INDEX idx_bot_conversations_status ON whatsapp_bot_conversations(status);
CREATE INDEX idx_bot_messages_conversation ON whatsapp_bot_messages(conversation_id);
CREATE INDEX idx_ai_training_project ON ai_training_instructions(commercial_project_id);

-- RLS para whatsapp_bot_config
ALTER TABLE whatsapp_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e managers podem gerenciar config do bot"
ON whatsapp_bot_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Supervisores podem gerenciar config do seu projeto"
ON whatsapp_bot_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM agent_telemarketing_mapping atm
    WHERE atm.supervisor_id = auth.uid()
    AND atm.commercial_project_id = whatsapp_bot_config.commercial_project_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_telemarketing_mapping atm
    WHERE atm.supervisor_id = auth.uid()
    AND atm.commercial_project_id = whatsapp_bot_config.commercial_project_id
  )
);

CREATE POLICY "Agentes podem visualizar config do seu projeto"
ON whatsapp_bot_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agent_telemarketing_mapping atm
    WHERE atm.tabuladormax_user_id = auth.uid()
    AND atm.commercial_project_id = whatsapp_bot_config.commercial_project_id
  )
);

-- RLS para whatsapp_bot_conversations
ALTER TABLE whatsapp_bot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e managers podem ver todas conversas do bot"
ON whatsapp_bot_conversations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Supervisores podem ver conversas do seu projeto"
ON whatsapp_bot_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agent_telemarketing_mapping atm
    WHERE atm.supervisor_id = auth.uid()
    AND atm.commercial_project_id = whatsapp_bot_conversations.commercial_project_id
  )
);

CREATE POLICY "Service role pode inserir/atualizar conversas"
ON whatsapp_bot_conversations FOR ALL
USING (true)
WITH CHECK (true);

-- RLS para whatsapp_bot_messages
ALTER TABLE whatsapp_bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e managers podem ver todas mensagens do bot"
ON whatsapp_bot_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Supervisores podem ver mensagens do seu projeto"
ON whatsapp_bot_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_bot_conversations wbc
    JOIN agent_telemarketing_mapping atm ON atm.commercial_project_id = wbc.commercial_project_id
    WHERE wbc.id = whatsapp_bot_messages.conversation_id
    AND atm.supervisor_id = auth.uid()
  )
);

CREATE POLICY "Service role pode inserir mensagens"
ON whatsapp_bot_messages FOR ALL
USING (true)
WITH CHECK (true);