-- RPC para Top 5 Scouters por período
CREATE OR REPLACE FUNCTION get_top_scouters(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE (
  name text,
  total bigint,
  confirmadas bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    scouter as name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE ficha_confirmada = true) as confirmadas
  FROM leads
  WHERE scouter IS NOT NULL
    AND criado >= p_start_date
    AND criado <= p_end_date
  GROUP BY scouter
  ORDER BY total DESC
  LIMIT 5;
$$;

-- RPC para Top 5 Telemarketing por período (agendamentos)
CREATE OR REPLACE FUNCTION get_top_telemarketing(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE (
  name text,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    responsible as name,
    COUNT(*) as count
  FROM leads
  WHERE responsible IS NOT NULL
    AND etapa = 'Agendados'
    AND data_criacao_agendamento >= p_start_date
    AND data_criacao_agendamento <= p_end_date
  GROUP BY responsible
  ORDER BY count DESC
  LIMIT 5;
$$;