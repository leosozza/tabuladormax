-- Criar tabela para rastrear eventos de sincronização
CREATE TABLE IF NOT EXISTS public.sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('create', 'update', 'delete')),
  direction TEXT NOT NULL CHECK (direction IN ('bitrix_to_supabase', 'supabase_to_bitrix', 'csv_import')),
  lead_id BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at ON public.sync_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_events_status ON public.sync_events(status);
CREATE INDEX IF NOT EXISTS idx_sync_events_direction ON public.sync_events(direction);

-- Habilitar RLS
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem visualizar eventos
CREATE POLICY "Admins can view sync events"
  ON public.sync_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_events;