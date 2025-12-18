-- =============================================
-- MAXTALK: Sistema de Comunicação Interna
-- =============================================

-- 1. Tabela de Conversas (privadas ou grupos)
CREATE TABLE public.maxtalk_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT, -- NULL para chat privado, nome para grupos
  type TEXT NOT NULL CHECK (type IN ('private', 'group')),
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Membros das conversas
CREATE TABLE public.maxtalk_conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.maxtalk_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- 3. Tabela de Mensagens
CREATE TABLE public.maxtalk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.maxtalk_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
  media_url TEXT,
  reply_to_id UUID REFERENCES public.maxtalk_messages(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_maxtalk_messages_conversation ON public.maxtalk_messages(conversation_id, created_at DESC);
CREATE INDEX idx_maxtalk_members_user ON public.maxtalk_conversation_members(user_id);
CREATE INDEX idx_maxtalk_members_conversation ON public.maxtalk_conversation_members(conversation_id);
CREATE INDEX idx_maxtalk_conversations_type ON public.maxtalk_conversations(type);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maxtalk_conversations_updated_at
  BEFORE UPDATE ON public.maxtalk_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Habilitar RLS
ALTER TABLE public.maxtalk_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maxtalk_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maxtalk_messages ENABLE ROW LEVEL SECURITY;

-- CONVERSAS: Usuários só veem conversas que participam
CREATE POLICY "Usuários veem conversas que participam"
  ON public.maxtalk_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maxtalk_conversation_members
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários autenticados podem criar conversas"
  ON public.maxtalk_conversations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins da conversa podem atualizar"
  ON public.maxtalk_conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.maxtalk_conversation_members
      WHERE conversation_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- MEMBROS: Usuários veem membros de conversas que participam
CREATE POLICY "Usuários veem membros de suas conversas"
  ON public.maxtalk_conversation_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maxtalk_conversation_members m
      WHERE m.conversation_id = conversation_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Criadores podem adicionar membros"
  ON public.maxtalk_conversation_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.maxtalk_conversation_members
        WHERE conversation_id = maxtalk_conversation_members.conversation_id 
        AND user_id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Membros podem atualizar seu próprio registro"
  ON public.maxtalk_conversation_members
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem remover membros"
  ON public.maxtalk_conversation_members
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.maxtalk_conversation_members
      WHERE conversation_id = maxtalk_conversation_members.conversation_id 
      AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- MENSAGENS: Usuários veem mensagens de conversas que participam
CREATE POLICY "Usuários veem mensagens de suas conversas"
  ON public.maxtalk_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maxtalk_conversation_members
      WHERE conversation_id = maxtalk_messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem enviar mensagens"
  ON public.maxtalk_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.maxtalk_conversation_members
      WHERE conversation_id = maxtalk_messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Autores podem editar suas mensagens"
  ON public.maxtalk_messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.maxtalk_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maxtalk_conversation_members;