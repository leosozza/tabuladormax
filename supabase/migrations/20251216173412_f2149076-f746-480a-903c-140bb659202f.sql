CREATE OR REPLACE FUNCTION public.check_message_rate_limit(
  p_phone_number text,
  p_message_hash text DEFAULT NULL::text,
  p_content_preview text DEFAULT NULL::text,
  p_source text DEFAULT 'tabulador'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_minute_count INTEGER;
  v_hour_count INTEGER;
  v_duplicate_count INTEGER;
  v_global_hour_count INTEGER;
  v_is_blocked BOOLEAN;
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

  -- IMPORTANTE: ignorar eventos vindos de webhooks (webhook_*)
  -- para que status/inbound não contaminem o rate-limit de ENVIO.

  -- Contar mensagens no último minuto para este número
  SELECT COUNT(*) INTO v_minute_count
  FROM message_rate_limits
  WHERE phone_number = p_phone_number
    AND sent_at > NOW() - INTERVAL '1 minute'
    AND blocked = false
    AND (source IS NULL OR source NOT LIKE 'webhook_%');

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
    AND blocked = false
    AND (source IS NULL OR source NOT LIKE 'webhook_%');

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
      AND blocked = false
      AND (source IS NULL OR source NOT LIKE 'webhook_%');

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
    AND blocked = false
    AND (source IS NULL OR source NOT LIKE 'webhook_%');

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
$function$;