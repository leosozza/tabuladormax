-- Atualizar função get_top_telemarketing para aceitar código Bitrix UC_QWPO2W além de Agendados
CREATE OR REPLACE FUNCTION public.get_top_telemarketing(
  p_start_date timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(name text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    responsible as name,
    COUNT(*) as count
  FROM leads
  WHERE responsible IS NOT NULL
    AND etapa IN ('Agendados', 'UC_QWPO2W')
    AND data_criacao_agendamento >= p_start_date
    AND data_criacao_agendamento <= p_end_date
  GROUP BY responsible
  ORDER BY count DESC
  LIMIT 5;
$function$;