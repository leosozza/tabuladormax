-- Corrigir search_path da função
CREATE OR REPLACE FUNCTION public.get_telemarketing_metrics(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_operator_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_leads INTEGER;
  v_agendamentos INTEGER;
  v_operator_stats JSONB;
  v_tabulacao_stats JSONB;
  v_scouter_stats JSONB;
BEGIN
  SELECT COUNT(*)
  INTO v_total_leads
  FROM leads
  WHERE date_modify >= p_start_date
    AND date_modify <= p_end_date
    AND bitrix_telemarketing_id IS NOT NULL
    AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id);

  SELECT COUNT(*)
  INTO v_agendamentos
  FROM leads
  WHERE data_criacao_agendamento >= p_start_date
    AND data_criacao_agendamento <= p_end_date
    AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id);

  SELECT COALESCE(jsonb_agg(op_data ORDER BY agendamentos DESC, leads DESC), '[]'::jsonb)
  INTO v_operator_stats
  FROM (
    SELECT 
      l.bitrix_telemarketing_id,
      COALESCE(t.name, 'Operador ' || l.bitrix_telemarketing_id) as name,
      COUNT(*) as leads,
      COUNT(*) FILTER (WHERE l.ficha_confirmada = true) as confirmadas,
      COUNT(*) FILTER (WHERE l.data_criacao_agendamento >= p_start_date AND l.data_criacao_agendamento <= p_end_date) as agendamentos,
      COUNT(*) FILTER (WHERE l.fonte_normalizada = 'Scouter - Fichas') as leads_scouter,
      COUNT(*) FILTER (WHERE l.fonte_normalizada = 'Meta') as leads_meta
    FROM leads l
    LEFT JOIN telemarketing_operators t ON l.bitrix_telemarketing_id = t.bitrix_id
    WHERE l.date_modify >= p_start_date
      AND l.date_modify <= p_end_date
      AND l.bitrix_telemarketing_id IS NOT NULL
      AND (p_operator_id IS NULL OR l.bitrix_telemarketing_id = p_operator_id)
    GROUP BY l.bitrix_telemarketing_id, t.name
  ) op_data;

  SELECT COALESCE(jsonb_agg(tab_data ORDER BY count DESC), '[]'::jsonb)
  INTO v_tabulacao_stats
  FROM (
    SELECT 
      COALESCE(status_tabulacao, 'Sem status') as status,
      COUNT(*) as count
    FROM leads
    WHERE date_modify >= p_start_date
      AND date_modify <= p_end_date
      AND bitrix_telemarketing_id IS NOT NULL
      AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id)
    GROUP BY status_tabulacao
  ) tab_data;

  SELECT COALESCE(jsonb_agg(scouter_data ORDER BY agendamentos DESC), '[]'::jsonb)
  INTO v_scouter_stats
  FROM (
    SELECT 
      COALESCE(scouter, 'Não identificado') as name,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date) as agendamentos
    FROM leads
    WHERE date_modify >= p_start_date
      AND date_modify <= p_end_date
      AND bitrix_telemarketing_id IS NOT NULL
      AND fonte_normalizada = 'Scouter - Fichas'
      AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id)
    GROUP BY scouter
    HAVING COUNT(*) FILTER (WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date) > 0
  ) scouter_data;

  RETURN jsonb_build_object(
    'total_leads', v_total_leads,
    'agendamentos', v_agendamentos,
    'operator_stats', v_operator_stats,
    'tabulacao_stats', v_tabulacao_stats,
    'scouter_stats', v_scouter_stats
  );
END;
$$;