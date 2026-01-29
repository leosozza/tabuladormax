-- Tabela para registrar histórico de chamadas SIP/Click-to-Call
CREATE TABLE public.sip_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  contact_name TEXT,
  operator_id UUID REFERENCES auth.users(id),
  operator_name TEXT,
  call_result TEXT NOT NULL CHECK (call_result IN ('atendida', 'nao_atendeu', 'ocupado', 'caixa_postal', 'numero_invalido', 'outro')),
  notes TEXT,
  call_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_sip_call_logs_phone ON public.sip_call_logs(phone_number);
CREATE INDEX idx_sip_call_logs_operator ON public.sip_call_logs(operator_id);
CREATE INDEX idx_sip_call_logs_created ON public.sip_call_logs(created_at DESC);
CREATE INDEX idx_sip_call_logs_bitrix ON public.sip_call_logs(bitrix_id) WHERE bitrix_id IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.sip_call_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários autenticados podem ver e criar logs
CREATE POLICY "Usuários autenticados podem ver logs de chamadas"
ON public.sip_call_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem criar logs de chamadas"
ON public.sip_call_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = operator_id);

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.sip_call_logs;