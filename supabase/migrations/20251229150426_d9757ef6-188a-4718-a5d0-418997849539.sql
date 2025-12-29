-- RPC para estatísticas do Dashboard de tabulação
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_show_all BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  total_leads BIGINT,
  scheduled_count BIGINT,
  todays_contacts BIGINT,
  action_stats JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action_stats JSONB;
  v_total_leads BIGINT;
  v_scheduled BIGINT;
  v_contacts BIGINT;
BEGIN
  -- Calcular action_stats (soma de ações por label)
  SELECT COALESCE(jsonb_object_agg(action_label, cnt), '{}'::jsonb)
  INTO v_action_stats
  FROM (
    SELECT 
      COALESCE(al.action_label, 'Desconhecido') as action_label,
      COUNT(*)::BIGINT as cnt
    FROM actions_log al
    WHERE 
      (p_start_date IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date IS NULL OR al.created_at <= p_end_date)
      AND (
        p_show_all = TRUE 
        OR p_user_id IS NULL 
        OR EXISTS (
          SELECT 1 FROM leads l 
          WHERE l.id = al.lead_id 
          AND l.responsible_user_id = p_user_id
        )
      )
    GROUP BY COALESCE(al.action_label, 'Desconhecido')
  ) sub;

  -- Calcular total de contatos hoje (soma de todas as ações)
  SELECT COALESCE(SUM((value)::BIGINT), 0)
  INTO v_contacts
  FROM jsonb_each_text(v_action_stats);

  -- Calcular agendamentos (buscar na action_stats)
  v_scheduled := COALESCE(
    (v_action_stats->>'Agendar')::BIGINT,
    (v_action_stats->>'Agendado')::BIGINT,
    0
  );

  -- Total de leads no cache (leads recentes)
  SELECT COUNT(*)::BIGINT
  INTO v_total_leads
  FROM leads l
  WHERE l.updated_at >= NOW() - INTERVAL '7 days'
    AND (
      p_show_all = TRUE 
      OR p_user_id IS NULL 
      OR l.responsible_user_id = p_user_id
    );

  RETURN QUERY SELECT v_total_leads, v_scheduled, v_contacts, v_action_stats;
END;
$$;