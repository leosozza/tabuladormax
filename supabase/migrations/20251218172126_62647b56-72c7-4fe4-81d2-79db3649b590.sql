-- Corrigir política de INSERT em maxtalk_conversation_members
-- Permitir que o criador da conversa adicione membros inicialmente

DROP POLICY IF EXISTS "Usuários podem adicionar membros" ON public.maxtalk_conversation_members;

CREATE POLICY "Usuários podem adicionar membros"
  ON public.maxtalk_conversation_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Pode inserir a si próprio
      user_id = auth.uid() OR
      -- OU ser admin da conversa
      public.is_maxtalk_admin(conversation_id, auth.uid()) OR
      -- OU ser o criador da conversa (para inserção inicial de membros)
      EXISTS (
        SELECT 1 FROM maxtalk_conversations
        WHERE id = conversation_id AND created_by = auth.uid()
      )
    )
  );