-- Atualizar RPC get_telemarketing_metrics para aceitar array de operadores
CREATE OR REPLACE FUNCTION get_telemarketing_metrics(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_operator_id INTEGER DEFAULT NULL,
  p_operator_ids INTEGER[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  total_leads INTEGER;
  total_agendamentos INTEGER;
  operator_stats JSONB;
  tabulacao_stats JSONB;
  scouter_stats JSONB;
BEGIN
  -- Total de leads trabalhados (filtrado por operador ou array de operadores)
  SELECT COUNT(*) INTO total_leads
  FROM leads
  WHERE date_modify >= p_start_date
    AND date_modify <= p_end_date
    AND bitrix_telemarketing_id IS NOT NULL
    AND (
      (p_operator_ids IS NOT NULL AND bitrix_telemarketing_id = ANY(p_operator_ids))
      OR (p_operator_ids IS NULL AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id))
    );

  -- Total de agendamentos (por data_criacao_agendamento)
  SELECT COUNT(*) INTO total_agendamentos
  FROM leads
  WHERE data_criacao_agendamento >= p_start_date
    AND data_criacao_agendamento <= p_end_date
    AND bitrix_telemarketing_id IS NOT NULL
    AND (
      (p_operator_ids IS NOT NULL AND bitrix_telemarketing_id = ANY(p_operator_ids))
      OR (p_operator_ids IS NULL AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id))
    );

  -- Stats por operador
  SELECT COALESCE(jsonb_agg(op_data ORDER BY op_data->>'agendamentos' DESC), '[]'::jsonb) INTO operator_stats
  FROM (
    SELECT jsonb_build_object(
      'bitrix_telemarketing_id', l.bitrix_telemarketing_id,
      'name', COALESCE(t.name, 'Operador ' || l.bitrix_telemarketing_id::text),
      'leads', COUNT(*),
      'confirmadas', COUNT(*) FILTER (WHERE l.ficha_confirmada = true),
      'agendamentos', COUNT(*) FILTER (WHERE l.data_criacao_agendamento >= p_start_date AND l.data_criacao_agendamento <= p_end_date),
      'leads_scouter', COUNT(*) FILTER (WHERE l.fonte_normalizada = 'Scouter - Fichas'),
      'leads_meta', COUNT(*) FILTER (WHERE l.fonte_normalizada = 'Meta Ads')
    ) as op_data
    FROM leads l
    LEFT JOIN telemarketing_operators t ON t.bitrix_id = l.bitrix_telemarketing_id
    WHERE l.date_modify >= p_start_date
      AND l.date_modify <= p_end_date
      AND l.bitrix_telemarketing_id IS NOT NULL
      AND (
        (p_operator_ids IS NOT NULL AND l.bitrix_telemarketing_id = ANY(p_operator_ids))
        OR (p_operator_ids IS NULL AND (p_operator_id IS NULL OR l.bitrix_telemarketing_id = p_operator_id))
      )
    GROUP BY l.bitrix_telemarketing_id, t.name
  ) sub;

  -- Stats por tabulação
  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status_tabulacao, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb) INTO tabulacao_stats
  FROM (
    SELECT status_tabulacao, COUNT(*) as cnt
    FROM leads
    WHERE date_modify >= p_start_date
      AND date_modify <= p_end_date
      AND bitrix_telemarketing_id IS NOT NULL
      AND status_tabulacao IS NOT NULL
      AND (
        (p_operator_ids IS NOT NULL AND bitrix_telemarketing_id = ANY(p_operator_ids))
        OR (p_operator_ids IS NULL AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id))
      )
    GROUP BY status_tabulacao
  ) sub;

  -- Stats por scouter (apenas leads de fonte Scouter)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', scouter, 'total_leads', total, 'agendamentos', agend) ORDER BY agend DESC), '[]'::jsonb) INTO scouter_stats
  FROM (
    SELECT 
      scouter, 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date) as agend
    FROM leads
    WHERE date_modify >= p_start_date
      AND date_modify <= p_end_date
      AND bitrix_telemarketing_id IS NOT NULL
      AND fonte_normalizada = 'Scouter - Fichas'
      AND scouter IS NOT NULL
      AND (
        (p_operator_ids IS NOT NULL AND bitrix_telemarketing_id = ANY(p_operator_ids))
        OR (p_operator_ids IS NULL AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id))
      )
    GROUP BY scouter
  ) sub;

  result := jsonb_build_object(
    'total_leads', total_leads,
    'agendamentos', total_agendamentos,
    'operator_stats', operator_stats,
    'tabulacao_stats', tabulacao_stats,
    'scouter_stats', scouter_stats
  );

  RETURN result;
END;
$$;

-- Atualizar RPC get_comparecidos_by_date para aceitar array de operadores
CREATE OR REPLACE FUNCTION get_comparecidos_by_date(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_operator_id INTEGER DEFAULT NULL,
  p_operator_ids INTEGER[] DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  nome_modelo TEXT,
  scouter TEXT,
  telemarketing TEXT,
  bitrix_telemarketing_id INTEGER,
  fonte_normalizada TEXT,
  data_compareceu TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id::INTEGER,
    l.name::TEXT,
    l.nome_modelo::TEXT,
    l.scouter::TEXT,
    l.telemarketing::TEXT,
    l.bitrix_telemarketing_id::INTEGER,
    l.fonte_normalizada::TEXT,
    (l.raw->>'UF_CRM_DATACOMPARECEU')::TEXT as data_compareceu
  FROM leads l
  WHERE l.bitrix_telemarketing_id IS NOT NULL
    AND l.raw->>'UF_CRM_DATACOMPARECEU' IS NOT NULL
    AND (l.raw->>'UF_CRM_DATACOMPARECEU')::DATE >= p_start_date::DATE
    AND (l.raw->>'UF_CRM_DATACOMPARECEU')::DATE <= p_end_date::DATE
    AND (
      (p_operator_ids IS NOT NULL AND l.bitrix_telemarketing_id = ANY(p_operator_ids))
      OR (p_operator_ids IS NULL AND (p_operator_id IS NULL OR l.bitrix_telemarketing_id = p_operator_id))
    )
  ORDER BY (l.raw->>'UF_CRM_DATACOMPARECEU')::DATE DESC;
END;
$$;