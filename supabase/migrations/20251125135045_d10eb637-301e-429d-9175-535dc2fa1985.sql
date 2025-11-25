-- Atualizar get_leads_stats para aceitar p_fonte
CREATE OR REPLACE FUNCTION public.get_leads_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS TABLE(total bigint, confirmados bigint, compareceram bigint, pendentes bigint, com_foto bigint, agendados bigint, reagendar bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- TOTAL: Filtrado por 'criado'
    COUNT(*) FILTER (
      WHERE (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
    )::BIGINT as total,
    
    -- CONFIRMADOS: Filtrado por 'criado'
    COUNT(*) FILTER (
      WHERE ficha_confirmada = true
        AND (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
    )::BIGINT as confirmados,
    
    -- COMPARECERAM: Filtrado por 'date_closed' (data de comparecimento)
    COUNT(*) FILTER (
      WHERE etapa IN ('CONVERTED', 'Lead convertido')
        AND date_closed IS NOT NULL
        AND (p_start_date IS NULL OR date_closed >= p_start_date)
        AND (p_end_date IS NULL OR date_closed <= p_end_date)
    )::BIGINT as compareceram,
    
    -- PENDENTES: Filtrado por 'criado'
    COUNT(*) FILTER (
      WHERE qualidade_lead IS NULL
        AND (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
    )::BIGINT as pendentes,
    
    -- COM FOTO: Filtrado por 'criado'
    COUNT(*) FILTER (
      WHERE cadastro_existe_foto = true
        AND (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
    )::BIGINT as com_foto,
    
    -- AGENDADOS: Filtrado por 'data_criacao_agendamento'
    COUNT(*) FILTER (
      WHERE etapa = 'Agendados'
        AND (p_start_date IS NULL OR data_criacao_agendamento >= p_start_date)
        AND (p_end_date IS NULL OR data_criacao_agendamento <= p_end_date)
    )::BIGINT as agendados,
    
    -- REAGENDAR: Filtrado por 'data_criacao_agendamento'
    COUNT(*) FILTER (
      WHERE etapa = 'Reagendar'
        AND (p_start_date IS NULL OR data_criacao_agendamento >= p_start_date)
        AND (p_end_date IS NULL OR data_criacao_agendamento <= p_end_date)
    )::BIGINT as reagendar
    
  FROM leads
  WHERE 
    (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter)
    AND (p_fonte IS NULL OR fonte_normalizada = p_fonte);
END;
$function$;