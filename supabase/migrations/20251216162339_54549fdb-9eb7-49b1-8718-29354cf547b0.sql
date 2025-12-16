-- ============================================
-- Sistema de Detecção de Loops Anti-Spam
-- ============================================

-- Tabela para rastreamento de rate limiting
CREATE TABLE public.message_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_hash TEXT,
  content_preview TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'tabulador',
  blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries rápidas
CREATE INDEX idx_rate_limits_phone_recent ON public.message_rate_limits(phone_number, sent_at DESC);
CREATE INDEX idx_rate_limits_hash ON public.message_rate_limits(message_hash);
CREATE INDEX idx_rate_limits_sent_at ON public.message_rate_limits(sent_at DESC);

-- Tabela para alertas de loops detectados
CREATE TABLE public.loop_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  message_count INTEGER,
  time_window_seconds INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para alertas
CREATE INDEX idx_loop_alerts_phone ON public.loop_alerts(phone_number);
CREATE INDEX idx_loop_alerts_unresolved ON public.loop_alerts(resolved, created_at DESC);
CREATE INDEX idx_loop_alerts_type ON public.loop_alerts(alert_type);

-- Tabela para números bloqueados temporariamente
CREATE TABLE public.blocked_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_until TIMESTAMPTZ,
  blocked_by UUID,
  unblocked_at TIMESTAMPTZ,
  unblocked_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocked_numbers_phone ON public.blocked_numbers(phone_number);
CREATE INDEX idx_blocked_numbers_active ON public.blocked_numbers(blocked_until) WHERE unblocked_at IS NULL;

-- Função para limpar registros antigos (manter apenas últimas 24h)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM message_rate_limits WHERE sent_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para verificar rate limits
CREATE OR REPLACE FUNCTION public.check_message_rate_limit(
  p_phone_number TEXT,
  p_message_hash TEXT DEFAULT NULL,
  p_content_preview TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'tabulador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minute_count INTEGER;
  v_hour_count INTEGER;
  v_duplicate_count INTEGER;
  v_global_hour_count INTEGER;
  v_is_blocked BOOLEAN;
  v_block_reason TEXT;
  v_result JSONB;
BEGIN
  -- Verificar se número está bloqueado
  SELECT EXISTS (
    SELECT 1 FROM blocked_numbers 
    WHERE phone_number = p_phone_number 
      AND unblocked_at IS NULL 
      AND (blocked_until IS NULL OR blocked_until > NOW())
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', 'Número temporariamente bloqueado',
      'alert_type', 'NUMBER_BLOCKED'
    );
  END IF;

  -- Contar mensagens no último minuto para este número
  SELECT COUNT(*) INTO v_minute_count
  FROM message_rate_limits
  WHERE phone_number = p_phone_number
    AND sent_at > NOW() - INTERVAL '1 minute'
    AND blocked = false;

  IF v_minute_count >= 5 THEN
    -- Registrar alerta
    INSERT INTO loop_alerts (phone_number, alert_type, severity, message_count, time_window_seconds, details)
    VALUES (p_phone_number, 'RATE_LIMIT_MINUTE', 'warning', v_minute_count, 60, 
            jsonb_build_object('source', p_source, 'limit', 5));
    
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', format('Limite de 5 mensagens/minuto atingido (%s enviadas)', v_minute_count),
      'alert_type', 'RATE_LIMIT_MINUTE',
      'count', v_minute_count
    );
  END IF;

  -- Contar mensagens na última hora para este número
  SELECT COUNT(*) INTO v_hour_count
  FROM message_rate_limits
  WHERE phone_number = p_phone_number
    AND sent_at > NOW() - INTERVAL '1 hour'
    AND blocked = false;

  IF v_hour_count >= 30 THEN
    -- Registrar alerta e bloquear número temporariamente
    INSERT INTO loop_alerts (phone_number, alert_type, severity, message_count, time_window_seconds, details)
    VALUES (p_phone_number, 'RATE_LIMIT_HOUR', 'critical', v_hour_count, 3600,
            jsonb_build_object('source', p_source, 'limit', 30));
    
    INSERT INTO blocked_numbers (phone_number, reason, blocked_until)
    VALUES (p_phone_number, 'Limite de 30 mensagens/hora atingido', NOW() + INTERVAL '1 hour')
    ON CONFLICT (phone_number) DO UPDATE SET
      reason = EXCLUDED.reason,
      blocked_until = EXCLUDED.blocked_until,
      unblocked_at = NULL;
    
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', format('Limite de 30 mensagens/hora atingido (%s enviadas). Número bloqueado por 1 hora.', v_hour_count),
      'alert_type', 'RATE_LIMIT_HOUR',
      'count', v_hour_count
    );
  END IF;

  -- Verificar mensagens duplicadas (mesmo hash) na última hora
  IF p_message_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO v_duplicate_count
    FROM message_rate_limits
    WHERE phone_number = p_phone_number
      AND message_hash = p_message_hash
      AND sent_at > NOW() - INTERVAL '1 hour'
      AND blocked = false;

    IF v_duplicate_count >= 3 THEN
      INSERT INTO loop_alerts (phone_number, alert_type, severity, message_count, time_window_seconds, details)
      VALUES (p_phone_number, 'DUPLICATE_CONTENT', 'warning', v_duplicate_count, 3600,
              jsonb_build_object('source', p_source, 'content_preview', LEFT(p_content_preview, 50)));
      
      RETURN jsonb_build_object(
        'blocked', true,
        'reason', format('Mensagem repetida %s vezes na última hora', v_duplicate_count),
        'alert_type', 'DUPLICATE_CONTENT',
        'count', v_duplicate_count
      );
    END IF;
  END IF;

  -- Verificar limite global por hora
  SELECT COUNT(*) INTO v_global_hour_count
  FROM message_rate_limits
  WHERE sent_at > NOW() - INTERVAL '1 hour'
    AND blocked = false;

  IF v_global_hour_count >= 500 THEN
    INSERT INTO loop_alerts (phone_number, alert_type, severity, message_count, time_window_seconds, details)
    VALUES (p_phone_number, 'GLOBAL_RATE_LIMIT', 'critical', v_global_hour_count, 3600,
            jsonb_build_object('source', p_source));
    
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', 'Limite global de 500 mensagens/hora atingido',
      'alert_type', 'GLOBAL_RATE_LIMIT',
      'count', v_global_hour_count
    );
  END IF;

  -- Registrar envio permitido
  INSERT INTO message_rate_limits (phone_number, message_hash, content_preview, source)
  VALUES (p_phone_number, p_message_hash, LEFT(p_content_preview, 100), p_source);

  RETURN jsonb_build_object(
    'blocked', false,
    'minute_count', v_minute_count + 1,
    'hour_count', v_hour_count + 1
  );
END;
$$;

-- Função para obter estatísticas de rate limiting
CREATE OR REPLACE FUNCTION public.get_rate_limit_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'messages_last_hour', (SELECT COUNT(*) FROM message_rate_limits WHERE sent_at > NOW() - INTERVAL '1 hour'),
    'messages_last_24h', (SELECT COUNT(*) FROM message_rate_limits WHERE sent_at > NOW() - INTERVAL '24 hours'),
    'blocked_last_hour', (SELECT COUNT(*) FROM message_rate_limits WHERE sent_at > NOW() - INTERVAL '1 hour' AND blocked = true),
    'active_alerts', (SELECT COUNT(*) FROM loop_alerts WHERE resolved = false),
    'critical_alerts', (SELECT COUNT(*) FROM loop_alerts WHERE resolved = false AND severity = 'critical'),
    'blocked_numbers', (SELECT COUNT(*) FROM blocked_numbers WHERE unblocked_at IS NULL AND (blocked_until IS NULL OR blocked_until > NOW())),
    'top_senders', (
      SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT phone_number, COUNT(*) as count
        FROM message_rate_limits
        WHERE sent_at > NOW() - INTERVAL '1 hour'
        GROUP BY phone_number
        ORDER BY count DESC
        LIMIT 5
      ) t
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Função para desbloquear número
CREATE OR REPLACE FUNCTION public.unblock_phone_number(p_phone_number TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE blocked_numbers
  SET unblocked_at = NOW(),
      unblocked_by = p_user_id
  WHERE phone_number = p_phone_number
    AND unblocked_at IS NULL;
  
  -- Resolver alertas pendentes para este número
  UPDATE loop_alerts
  SET resolved = true,
      resolved_at = NOW(),
      resolved_by = p_user_id
  WHERE phone_number = p_phone_number
    AND resolved = false;
  
  RETURN FOUND;
END;
$$;

-- Enable RLS
ALTER TABLE public.message_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_numbers ENABLE ROW LEVEL SECURITY;

-- Policies para message_rate_limits
CREATE POLICY "Service role can manage rate limits"
  ON public.message_rate_limits FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view rate limits"
  ON public.message_rate_limits FOR SELECT
  USING (true);

-- Policies para loop_alerts
CREATE POLICY "Service role can manage alerts"
  ON public.loop_alerts FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view alerts"
  ON public.loop_alerts FOR SELECT
  USING (true);

CREATE POLICY "Admins can resolve alerts"
  ON public.loop_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Policies para blocked_numbers
CREATE POLICY "Service role can manage blocked numbers"
  ON public.blocked_numbers FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view blocked numbers"
  ON public.blocked_numbers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage blocked numbers"
  ON public.blocked_numbers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));