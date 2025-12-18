-- Criar função RPC para obter ou criar conversa privada (atômica)
CREATE OR REPLACE FUNCTION get_or_create_private_conversation(
  p_user_id UUID,
  p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Verificar se já existe conversa privada entre os dois usuários
  SELECT c.id INTO v_conversation_id
  FROM maxtalk_conversations c
  WHERE c.type = 'private'
    AND EXISTS (
      SELECT 1 FROM maxtalk_conversation_members m1
      WHERE m1.conversation_id = c.id AND m1.user_id = p_user_id
    )
    AND EXISTS (
      SELECT 1 FROM maxtalk_conversation_members m2
      WHERE m2.conversation_id = c.id AND m2.user_id = p_other_user_id
    )
  LIMIT 1;
  
  -- Se já existe, retornar o ID
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;
  
  -- Criar nova conversa privada
  INSERT INTO maxtalk_conversations (type, created_by)
  VALUES ('private', p_user_id)
  RETURNING id INTO v_conversation_id;
  
  -- Adicionar membros
  INSERT INTO maxtalk_conversation_members (conversation_id, user_id, role)
  VALUES 
    (v_conversation_id, p_user_id, 'admin'),
    (v_conversation_id, p_other_user_id, 'member');
  
  RETURN v_conversation_id;
END;
$$;

-- Limpar conversas privadas duplicadas (mantendo apenas a mais antiga)
WITH duplicates AS (
  SELECT c.id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        LEAST(m1.user_id, m2.user_id),
        GREATEST(m1.user_id, m2.user_id)
      ORDER BY c.created_at ASC
    ) as rn
  FROM maxtalk_conversations c
  JOIN maxtalk_conversation_members m1 ON c.id = m1.conversation_id
  JOIN maxtalk_conversation_members m2 ON c.id = m2.conversation_id AND m1.user_id < m2.user_id
  WHERE c.type = 'private'
)
DELETE FROM maxtalk_conversations 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);