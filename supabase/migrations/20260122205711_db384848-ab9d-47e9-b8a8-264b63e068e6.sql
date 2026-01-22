-- =============================================
-- Tabela: whatsapp_operator_notifications
-- Notificações em tempo real para operadores
-- =============================================
CREATE TABLE public.whatsapp_operator_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  phone_number TEXT,
  bitrix_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices com nomes únicos
CREATE INDEX idx_wa_notifications_operator ON public.whatsapp_operator_notifications(operator_id);
CREATE INDEX idx_wa_notifications_unread ON public.whatsapp_operator_notifications(operator_id) 
  WHERE read_at IS NULL;

-- RLS - Operadores só veem suas próprias notificações
ALTER TABLE public.whatsapp_operator_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.whatsapp_operator_notifications FOR SELECT TO authenticated 
USING (operator_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications"
ON public.whatsapp_operator_notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON public.whatsapp_operator_notifications FOR UPDATE TO authenticated 
USING (operator_id = auth.uid());

-- Habilitar Realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_operator_notifications;