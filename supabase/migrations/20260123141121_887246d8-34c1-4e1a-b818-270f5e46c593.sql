-- =============================================
-- Tabela: whatsapp_conversation_closures
-- Rastreia conversas encerradas
-- =============================================
CREATE TABLE public.whatsapp_conversation_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  closed_by UUID REFERENCES auth.users(id),
  closure_reason TEXT,
  reopened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number)
);

-- Indices
CREATE INDEX idx_wa_closures_phone ON public.whatsapp_conversation_closures(phone_number);
CREATE INDEX idx_wa_closures_active ON public.whatsapp_conversation_closures(phone_number) 
  WHERE reopened_at IS NULL;

-- RLS
ALTER TABLE public.whatsapp_conversation_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view closures"
ON public.whatsapp_conversation_closures FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert closures"
ON public.whatsapp_conversation_closures FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update closures"
ON public.whatsapp_conversation_closures FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete closures"
ON public.whatsapp_conversation_closures FOR DELETE TO authenticated USING (true);

-- =============================================
-- Tabela: whatsapp_conversation_participants
-- Gerencia agentes convidados para conversas
-- =============================================
CREATE TABLE public.whatsapp_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  role TEXT DEFAULT 'participant',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number, operator_id)
);

-- Indices
CREATE INDEX idx_wa_participants_phone ON public.whatsapp_conversation_participants(phone_number);
CREATE INDEX idx_wa_participants_operator ON public.whatsapp_conversation_participants(operator_id);

-- RLS
ALTER TABLE public.whatsapp_conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view participants"
ON public.whatsapp_conversation_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert participants"
ON public.whatsapp_conversation_participants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete participants"
ON public.whatsapp_conversation_participants FOR DELETE TO authenticated USING (true);