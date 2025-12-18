-- 1. Criar função helper que bypassa RLS para verificar membership
CREATE OR REPLACE FUNCTION public.is_maxtalk_member(conv_id UUID, usr_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM maxtalk_conversation_members
    WHERE conversation_id = conv_id AND user_id = usr_id
  );
$$;

-- 2. Criar função para verificar se é admin da conversa
CREATE OR REPLACE FUNCTION public.is_maxtalk_admin(conv_id UUID, usr_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM maxtalk_conversation_members
    WHERE conversation_id = conv_id AND user_id = usr_id AND role = 'admin'
  );
$$;

-- 3. Dropar políticas problemáticas de maxtalk_conversation_members
DROP POLICY IF EXISTS "Usuários veem membros de suas conversas" ON public.maxtalk_conversation_members;
DROP POLICY IF EXISTS "Criadores podem adicionar membros" ON public.maxtalk_conversation_members;
DROP POLICY IF EXISTS "Admins podem remover membros" ON public.maxtalk_conversation_members;

-- 4. Recriar políticas de members usando funções helpers
CREATE POLICY "Usuários veem membros de suas conversas"
  ON public.maxtalk_conversation_members
  FOR SELECT
  USING (public.is_maxtalk_member(conversation_id, auth.uid()));

CREATE POLICY "Usuários podem adicionar membros"
  ON public.maxtalk_conversation_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      public.is_maxtalk_admin(conversation_id, auth.uid())
    )
  );

CREATE POLICY "Admins podem remover membros"
  ON public.maxtalk_conversation_members
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    public.is_maxtalk_admin(conversation_id, auth.uid())
  );

-- 5. Dropar políticas problemáticas de maxtalk_messages
DROP POLICY IF EXISTS "Usuários veem mensagens de suas conversas" ON public.maxtalk_messages;
DROP POLICY IF EXISTS "Membros podem enviar mensagens" ON public.maxtalk_messages;

-- 6. Recriar políticas de messages
CREATE POLICY "Usuários veem mensagens de suas conversas"
  ON public.maxtalk_messages
  FOR SELECT
  USING (public.is_maxtalk_member(conversation_id, auth.uid()));

CREATE POLICY "Membros podem enviar mensagens"
  ON public.maxtalk_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    public.is_maxtalk_member(conversation_id, auth.uid())
  );

-- 7. Dropar políticas problemáticas de maxtalk_conversations
DROP POLICY IF EXISTS "Usuários veem conversas que participam" ON public.maxtalk_conversations;
DROP POLICY IF EXISTS "Admins da conversa podem atualizar" ON public.maxtalk_conversations;

-- 8. Recriar políticas de conversations
CREATE POLICY "Usuários veem conversas que participam"
  ON public.maxtalk_conversations
  FOR SELECT
  USING (public.is_maxtalk_member(id, auth.uid()));

CREATE POLICY "Admins da conversa podem atualizar"
  ON public.maxtalk_conversations
  FOR UPDATE
  USING (public.is_maxtalk_admin(id, auth.uid()));