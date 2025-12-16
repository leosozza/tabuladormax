-- ============================================
-- Tabela whatsapp_messages para armazenar histórico de mensagens
-- ============================================

CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  conversation_id INTEGER,
  gupshup_message_id TEXT,
  
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  template_name TEXT,
  
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'enqueued')),
  sent_by TEXT CHECK (sent_by IN ('bitrix', 'tabulador', 'operador', 'gupshup')),
  sender_name TEXT,
  
  media_url TEXT,
  media_type TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_whatsapp_messages_phone ON public.whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_bitrix ON public.whatsapp_messages(bitrix_id);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_gupshup_id ON public.whatsapp_messages(gupshup_message_id);

-- Habilitar RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política de SELECT para usuários autenticados
CREATE POLICY "Authenticated users can view messages"
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (true);

-- Política de INSERT para usuários autenticados
CREATE POLICY "Authenticated users can insert messages"
ON public.whatsapp_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política de UPDATE para usuários autenticados
CREATE POLICY "Authenticated users can update messages"
ON public.whatsapp_messages
FOR UPDATE
TO authenticated
USING (true);

-- Política de DELETE apenas para admins
CREATE POLICY "Admins can delete messages"
ON public.whatsapp_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- Adicionar colunas na tabela chatwoot_contacts para controle
ALTER TABLE public.chatwoot_contacts 
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
ADD COLUMN IF NOT EXISTS last_message_direction TEXT,
ADD COLUMN IF NOT EXISTS conversation_status TEXT DEFAULT 'open';