-- Criar tabela de sessões para API Scouter
CREATE TABLE public.scouter_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scouter_id UUID NOT NULL REFERENCES public.scouters(id) ON DELETE CASCADE,
  bitrix_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_scouter_sessions_token ON public.scouter_sessions(session_token);
CREATE INDEX idx_scouter_sessions_expires ON public.scouter_sessions(expires_at);
CREATE INDEX idx_scouter_sessions_scouter ON public.scouter_sessions(scouter_id);

-- Habilitar RLS
ALTER TABLE public.scouter_sessions ENABLE ROW LEVEL SECURITY;

-- Política: apenas service role pode gerenciar sessões (edge function usa service role)
CREATE POLICY "Service role can manage scouter sessions"
ON public.scouter_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_scouter_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM scouter_sessions WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comentários
COMMENT ON TABLE public.scouter_sessions IS 'Sessões de autenticação para a API do app Scouter';
COMMENT ON COLUMN public.scouter_sessions.session_token IS 'Token único de sessão (válido por 24h)';
COMMENT ON COLUMN public.scouter_sessions.expires_at IS 'Data/hora de expiração da sessão';