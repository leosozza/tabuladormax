-- Atualizar RPC get_telemarketing_metrics para incluir contagens de tabulação por operador
CREATE OR REPLACE FUNCTION get_telemarketing_metrics(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_operator_id bigint DEFAULT NULL,
  p_operator_ids bigint[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH filtered_leads AS (
    SELECT 
      l.id,
      l.bitrix_telemarketing_id,
      l.ficha_confirmada,
      l.fonte_normalizada,
      l.status_tabulacao,
      l.etapa,
      l.data_criacao_agendamento,
      t.name as op_name
    FROM leads l
    LEFT JOIN telemarketing_operators t ON l.bitrix_telemarketing_id = t.bitrix_id
    WHERE l.date_modify >= p_start_date
      AND l.date_modify <= p_end_date
      AND l.bitrix_telemarketing_id IS NOT NULL
      AND (p_operator_id IS NULL OR l.bitrix_telemarketing_id = p_operator_id)
      AND (p_operator_ids IS NULL OR l.bitrix_telemarketing_id = ANY(p_operator_ids))
  ),
  operator_stats AS (
    SELECT 
      bitrix_telemarketing_id,
      COALESCE(op_name, 'Operador ' || bitrix_telemarketing_id) as name,
      COUNT(*) as leads,
      COUNT(*) FILTER (WHERE ficha_confirmada = true) as confirmadas,
      COUNT(*) FILTER (WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date) as agendamentos,
      COUNT(*) FILTER (WHERE fonte_normalizada = 'Scouter - Fichas') as leads_scouter,
      COUNT(*) FILTER (WHERE fonte_normalizada = 'Meta Ads') as leads_meta,
      ROUND(
        (COUNT(*) FILTER (WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
      ) as taxa_conversao,
      -- Novas métricas de tabulação
      COUNT(*) FILTER (WHERE status_tabulacao = '3622' OR status_tabulacao = '[3622]') as sem_interesse,
      COUNT(*) FILTER (WHERE status_tabulacao = '3626' OR status_tabulacao = '[3626]') as retorno,
      COUNT(*) FILTER (WHERE status_tabulacao = '3616' OR status_tabulacao = '[3616]') as lig_interrompida,
      COUNT(*) FILTER (WHERE status_tabulacao = '3618' OR status_tabulacao = '[3618]') as caixa_postal
    FROM filtered_leads
    GROUP BY bitrix_telemarketing_id, op_name
  ),
  tabulacao_stats AS (
    SELECT 
      COALESCE(status_tabulacao, 'null') as status,
      COUNT(*) as count
    FROM filtered_leads
    GROUP BY status_tabulacao
    ORDER BY count DESC
  ),
  scouter_stats AS (
    SELECT 
      l.scouter as name,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE l.data_criacao_agendamento >= p_start_date AND l.data_criacao_agendamento <= p_end_date) as agendamentos
    FROM leads l
    WHERE l.date_modify >= p_start_date
      AND l.date_modify <= p_end_date
      AND l.bitrix_telemarketing_id IS NOT NULL
      AND l.fonte_normalizada = 'Scouter - Fichas'
      AND l.scouter IS NOT NULL
      AND (p_operator_id IS NULL OR l.bitrix_telemarketing_id = p_operator_id)
      AND (p_operator_ids IS NULL OR l.bitrix_telemarketing_id = ANY(p_operator_ids))
    GROUP BY l.scouter
    ORDER BY agendamentos DESC
  )
  SELECT json_build_object(
    'total_leads', (SELECT COUNT(*) FROM filtered_leads),
    'total_agendamentos', (SELECT COUNT(*) FROM filtered_leads WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date),
    'total_confirmadas', (SELECT COUNT(*) FROM filtered_leads WHERE ficha_confirmada = true),
    'operator_stats', COALESCE((SELECT json_agg(row_to_json(operator_stats)) FROM operator_stats), '[]'::json),
    'tabulacao_stats', COALESCE((SELECT json_agg(row_to_json(tabulacao_stats)) FROM tabulacao_stats), '[]'::json),
    'scouter_stats', COALESCE((SELECT json_agg(row_to_json(scouter_stats)) FROM scouter_stats), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$;