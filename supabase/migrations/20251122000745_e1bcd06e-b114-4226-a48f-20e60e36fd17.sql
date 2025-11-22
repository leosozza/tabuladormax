-- Fase 1: Atualizar Sistema de Atribuição

-- 1. Criar índice para otimizar buscas por responsible_user_id
CREATE INDEX IF NOT EXISTS idx_leads_responsible_user_id 
ON leads(responsible_user_id);

-- 2. Adicionar campo last_message_at em chatwoot_contacts (para ordenação)
ALTER TABLE chatwoot_contacts 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- 3. Criar tabela de log de envio em lote
CREATE TABLE IF NOT EXISTS bulk_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id),
  template_id TEXT,
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  conversation_ids INTEGER[],
  results JSONB,
  completed_at TIMESTAMPTZ
);

-- 4. Habilitar RLS na tabela bulk_message_logs
ALTER TABLE bulk_message_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para bulk_message_logs
CREATE POLICY "Users can view their own bulk logs"
ON bulk_message_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bulk logs"
ON bulk_message_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bulk logs"
ON bulk_message_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);