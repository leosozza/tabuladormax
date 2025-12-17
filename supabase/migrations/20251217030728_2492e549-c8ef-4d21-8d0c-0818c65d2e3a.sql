-- Tabela de notificações para telemarketing
CREATE TABLE public.telemarketing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_telemarketing_id INTEGER NOT NULL,
  commercial_project_id UUID REFERENCES commercial_projects(id),
  type TEXT NOT NULL CHECK (type IN ('new_message', 'bot_transfer', 'urgent', 'window_closing')),
  title TEXT NOT NULL,
  message TEXT,
  lead_id INTEGER,
  phone_number TEXT,
  conversation_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_notifications_telemarketing ON telemarketing_notifications(bitrix_telemarketing_id);
CREATE INDEX idx_notifications_unread ON telemarketing_notifications(bitrix_telemarketing_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON telemarketing_notifications(created_at DESC);

-- RLS
ALTER TABLE telemarketing_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de notificações próprias"
ON telemarketing_notifications FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de notificações"
ON telemarketing_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de notificações próprias"
ON telemarketing_notifications FOR UPDATE
USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE telemarketing_notifications;