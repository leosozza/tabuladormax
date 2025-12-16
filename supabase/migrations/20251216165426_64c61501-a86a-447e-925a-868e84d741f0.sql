-- Function to detect and log external system loops from webhook events
CREATE OR REPLACE FUNCTION public.detect_webhook_loop(
  p_phone_number TEXT,
  p_event_type TEXT,
  p_time_window_seconds INT DEFAULT 60,
  p_threshold INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent_count INT;
  v_is_blocked BOOLEAN;
  v_alert_exists BOOLEAN;
BEGIN
  -- Check if number is already blocked
  SELECT EXISTS(
    SELECT 1 FROM blocked_numbers 
    WHERE phone_number = p_phone_number 
    AND unblocked_at IS NULL
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', 'Número já bloqueado'
    );
  END IF;
  
  -- Count recent events for this number
  SELECT COUNT(*) INTO v_recent_count
  FROM message_rate_limits
  WHERE phone_number = p_phone_number
  AND sent_at > NOW() - (p_time_window_seconds || ' seconds')::INTERVAL;
  
  -- Log this event
  INSERT INTO message_rate_limits (phone_number, source, sent_at)
  VALUES (p_phone_number, 'webhook_' || p_event_type, NOW());
  
  -- Check if threshold exceeded
  IF v_recent_count >= p_threshold THEN
    -- Check if alert already exists for this loop
    SELECT EXISTS(
      SELECT 1 FROM loop_alerts
      WHERE phone_number = p_phone_number
      AND alert_type = 'external_loop'
      AND resolved = false
      AND created_at > NOW() - INTERVAL '1 hour'
    ) INTO v_alert_exists;
    
    IF NOT v_alert_exists THEN
      -- Create new alert
      INSERT INTO loop_alerts (
        phone_number,
        alert_type,
        severity,
        message_count,
        time_window_seconds,
        details
      ) VALUES (
        p_phone_number,
        'external_loop',
        CASE WHEN v_recent_count >= p_threshold * 2 THEN 'critical' ELSE 'warning' END,
        v_recent_count,
        p_time_window_seconds,
        jsonb_build_object(
          'event_type', p_event_type,
          'detected_at', NOW(),
          'source', 'gupshup_webhook'
        )
      );
    END IF;
    
    RETURN jsonb_build_object(
      'loop_detected', true,
      'count', v_recent_count,
      'threshold', p_threshold,
      'should_block', v_recent_count >= p_threshold * 3
    );
  END IF;
  
  RETURN jsonb_build_object(
    'blocked', false,
    'count', v_recent_count
  );
END;
$$;

-- Function to emergency block a number
CREATE OR REPLACE FUNCTION public.emergency_block_number(
  p_phone_number TEXT,
  p_reason TEXT DEFAULT 'Loop detectado - bloqueio de emergência',
  p_duration_hours INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert or update blocked number
  INSERT INTO blocked_numbers (
    phone_number,
    reason,
    blocked_until
  ) VALUES (
    p_phone_number,
    p_reason,
    NOW() + (p_duration_hours || ' hours')::INTERVAL
  )
  ON CONFLICT (phone_number) 
  WHERE unblocked_at IS NULL
  DO UPDATE SET
    reason = p_reason,
    blocked_until = NOW() + (p_duration_hours || ' hours')::INTERVAL;
  
  -- Resolve any open alerts for this number
  UPDATE loop_alerts
  SET resolved = true, resolved_at = NOW()
  WHERE phone_number = p_phone_number AND resolved = false;
  
  RETURN jsonb_build_object(
    'success', true,
    'phone_number', p_phone_number,
    'blocked_until', NOW() + (p_duration_hours || ' hours')::INTERVAL
  );
END;
$$;

-- Function to get top active numbers in last hour
CREATE OR REPLACE FUNCTION public.get_top_active_numbers(p_limit INT DEFAULT 10)
RETURNS TABLE(
  phone_number TEXT,
  event_count BIGINT,
  last_event TIMESTAMPTZ,
  sources TEXT[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.phone_number,
    COUNT(*)::BIGINT as event_count,
    MAX(m.sent_at) as last_event,
    ARRAY_AGG(DISTINCT m.source) as sources
  FROM message_rate_limits m
  WHERE m.sent_at > NOW() - INTERVAL '1 hour'
  GROUP BY m.phone_number
  ORDER BY event_count DESC
  LIMIT p_limit;
END;
$$;