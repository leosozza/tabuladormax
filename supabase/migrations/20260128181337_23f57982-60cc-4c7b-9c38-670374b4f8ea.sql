-- Tabela para notas internas entre agentes (não enviadas ao cliente)
CREATE TABLE public.whatsapp_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  author_id UUID REFERENCES public.profiles(id) NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  target_operator_id UUID REFERENCES public.profiles(id)
);

-- Índices para notas internas
CREATE INDEX idx_internal_notes_phone ON public.whatsapp_internal_notes(phone_number);
CREATE INDEX idx_internal_notes_created ON public.whatsapp_internal_notes(created_at DESC);
CREATE INDEX idx_internal_notes_author ON public.whatsapp_internal_notes(author_id);

-- RLS para notas internas
ALTER TABLE public.whatsapp_internal_notes ENABLE ROW LEVEL SECURITY;

-- Política: participantes e autores podem ver notas da conversa
CREATE POLICY "Participantes podem ver notas" ON public.whatsapp_internal_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversation_participants p
    WHERE p.phone_number = whatsapp_internal_notes.phone_number
    AND p.operator_id = auth.uid()
  )
  OR author_id = auth.uid()
);

-- Política: usuários autenticados podem criar notas
CREATE POLICY "Usuários podem criar notas" ON public.whatsapp_internal_notes
FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Habilitar realtime para notas internas
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_internal_notes;

-- Tabela para histórico de resoluções
CREATE TABLE public.whatsapp_participation_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  operator_id UUID REFERENCES public.profiles(id) NOT NULL,
  operator_name TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES public.profiles(id),
  inviter_name TEXT,
  priority INTEGER
);

-- Índices para resoluções
CREATE INDEX idx_resolutions_phone ON public.whatsapp_participation_resolutions(phone_number);
CREATE INDEX idx_resolutions_date ON public.whatsapp_participation_resolutions(resolved_at DESC);

-- RLS para resoluções
ALTER TABLE public.whatsapp_participation_resolutions ENABLE ROW LEVEL SECURITY;

-- Política: todos autenticados podem ver resoluções
CREATE POLICY "Usuários autenticados podem ver resoluções" ON public.whatsapp_participation_resolutions
FOR SELECT TO authenticated USING (true);

-- Política: usuários podem criar suas próprias resoluções
CREATE POLICY "Usuários podem criar resoluções" ON public.whatsapp_participation_resolutions
FOR INSERT WITH CHECK (auth.uid() = operator_id);