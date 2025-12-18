-- Dropar política atual de SELECT em conversas
DROP POLICY IF EXISTS "Usuários veem conversas que participam" ON public.maxtalk_conversations;

-- Criar nova política que permite ver:
-- 1. Conversas que o usuário criou (para o .select() após INSERT funcionar)
-- 2. Conversas onde o usuário é membro
CREATE POLICY "Usuários veem conversas que participam ou criaram"
  ON public.maxtalk_conversations
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    public.is_maxtalk_member(id, auth.uid())
  );