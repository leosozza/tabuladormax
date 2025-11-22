-- Criar tabela de etiquetas de conversas
CREATE TABLE IF NOT EXISTS public.conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela de associação conversa-etiqueta
CREATE TABLE IF NOT EXISTS public.conversation_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id INTEGER NOT NULL,
  label_id UUID REFERENCES public.conversation_labels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(conversation_id, label_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_label_assignments_conversation 
ON public.conversation_label_assignments(conversation_id);

CREATE INDEX IF NOT EXISTS idx_label_assignments_label 
ON public.conversation_label_assignments(label_id);

-- Habilitar RLS
ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_label_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para conversation_labels (todos podem ver, apenas autenticados podem criar)
CREATE POLICY "Labels são visíveis para todos usuários autenticados"
  ON public.conversation_labels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar labels"
  ON public.conversation_labels
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem atualizar suas labels"
  ON public.conversation_labels
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Criadores podem deletar suas labels"
  ON public.conversation_labels
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Políticas para conversation_label_assignments
CREATE POLICY "Label assignments são visíveis para todos usuários autenticados"
  ON public.conversation_label_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar label assignments"
  ON public.conversation_label_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Usuários autenticados podem deletar label assignments"
  ON public.conversation_label_assignments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = assigned_by);

-- Inserir etiquetas padrão
INSERT INTO public.conversation_labels (name, color, created_by) 
VALUES 
  ('Urgente', '#ef4444', (SELECT id FROM auth.users LIMIT 1)),
  ('Aguardando resposta', '#f59e0b', (SELECT id FROM auth.users LIMIT 1)),
  ('Respondido', '#22c55e', (SELECT id FROM auth.users LIMIT 1)),
  ('Follow-up agendado', '#3b82f6', (SELECT id FROM auth.users LIMIT 1)),
  ('Qualificado', '#a855f7', (SELECT id FROM auth.users LIMIT 1)),
  ('Sem interesse', '#6b7280', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (name) DO NOTHING;