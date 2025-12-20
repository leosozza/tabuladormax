-- RPC para StatsComparison: comparativo de períodos
CREATE OR REPLACE FUNCTION get_stats_comparison(
  p_current_start timestamptz,
  p_current_end timestamptz,
  p_previous_start timestamptz,
  p_previous_end timestamptz
)
RETURNS TABLE (
  period text,
  total bigint,
  confirmed bigint,
  present bigint
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'current' as period,
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE ficha_confirmada = true) as confirmed,
         COUNT(*) FILTER (WHERE presenca_confirmada = true) as present
  FROM leads
  WHERE criado >= p_current_start AND criado < p_current_end
  UNION ALL
  SELECT 'previous' as period,
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE ficha_confirmada = true) as confirmed,
         COUNT(*) FILTER (WHERE presenca_confirmada = true) as present
  FROM leads
  WHERE criado >= p_previous_start AND criado < p_previous_end;
$$;

-- RPC para LeadrometroCard: métricas de qualidade
CREATE OR REPLACE FUNCTION get_leadrometro_stats(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_source_filter text DEFAULT 'all'
)
RETURNS TABLE (
  total bigint,
  com_foto bigint,
  confirmados bigint,
  agendados bigint,
  convertidos bigint,
  em_analise bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE cadastro_existe_foto = true) as com_foto,
    COUNT(*) FILTER (WHERE ficha_confirmada = true) as confirmados,
    COUNT(*) FILTER (WHERE etapa IN ('Agendados', 'UC_QWPO2W', 'Em agendamento', 'Reagendar', 'Retornar Ligação')) as agendados,
    COUNT(*) FILTER (WHERE etapa IN ('Lead convertido', 'UC_GPH3PL') OR compareceu = true) as convertidos,
    COUNT(*) FILTER (WHERE etapa IN ('Lead a Qualificar', 'Triagem', 'Banco de Leads')) as em_analise
  FROM leads
  WHERE criado >= p_start_date 
    AND criado <= p_end_date
    AND (
      p_source_filter = 'all' 
      OR (p_source_filter = 'scouter' AND scouter IS NOT NULL AND scouter != '')
      OR (p_source_filter = 'meta' AND (scouter IS NULL OR scouter = ''))
    );
$$;