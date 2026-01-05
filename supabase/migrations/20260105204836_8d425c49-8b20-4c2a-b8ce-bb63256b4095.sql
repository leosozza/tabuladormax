-- Primeiro, dropar a função existente com a assinatura exata
DROP FUNCTION IF EXISTS public.get_telemarketing_metrics(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER[]);

-- Recriar com a ordenação corrigida
CREATE OR REPLACE FUNCTION public.get_telemarketing_metrics(
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
  total_confirmadas INTEGER;
  total_agendamentos INTEGER;
  operator_stats JSONB;
BEGIN
  -- Calcular totais
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE ficha_confirmada = true),
    COUNT(*) FILTER (WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date)
  INTO total_leads, total_confirmadas, total_agendamentos
  FROM leads
  WHERE date_modify >= p_start_date
    AND date_modify <= p_end_date
    AND bitrix_telemarketing_id IS NOT NULL
    AND (
      (p_operator_ids IS NOT NULL AND bitrix_telemarketing_id = ANY(p_operator_ids))
      OR (p_operator_ids IS NULL AND (p_operator_id IS NULL OR bitrix_telemarketing_id = p_operator_id))
    );

  -- Calcular stats por operador com ordenação corrigida
  -- 1º critério: agendamentos DESC (como INTEGER)
  -- 2º critério: taxa_conversao DESC (desempate quando agendamentos iguais)
  SELECT COALESCE(jsonb_agg(op_data ORDER BY 
    (op_data->>'agendamentos')::INTEGER DESC, 
    (op_data->>'taxa_conversao')::NUMERIC DESC
  ), '[]'::jsonb) INTO operator_stats
  FROM (
    SELECT jsonb_build_object(
      'bitrix_telemarketing_id', l.bitrix_telemarketing_id,
      'name', COALESCE(t.name, 'Operador ' || l.bitrix_telemarketing_id::text),
      'leads', COUNT(*),
      'confirmadas', COUNT(*) FILTER (WHERE l.ficha_confirmada = true),
      'agendamentos', COUNT(*) FILTER (WHERE l.data_criacao_agendamento >= p_start_date AND l.data_criacao_agendamento <= p_end_date),
      'leads_scouter', COUNT(*) FILTER (WHERE l.fonte_normalizada = 'Scouter - Fichas'),
      'leads_meta', COUNT(*) FILTER (WHERE l.fonte_normalizada = 'Meta Ads'),
      'taxa_conversao', CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE l.data_criacao_agendamento >= p_start_date AND l.data_criacao_agendamento <= p_end_date)::NUMERIC / COUNT(*) * 100), 2)
        ELSE 0 
      END
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

  -- Montar resultado final
  result := jsonb_build_object(
    'total_leads', COALESCE(total_leads, 0),
    'total_confirmadas', COALESCE(total_confirmadas, 0),
    'total_agendamentos', COALESCE(total_agendamentos, 0),
    'operator_stats', operator_stats
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_telemarketing_metrics(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER[]) IS 'Calcula métricas de telemarketing com ranking ordenado por agendamentos (DESC) e taxa de conversão como desempate (DESC).';