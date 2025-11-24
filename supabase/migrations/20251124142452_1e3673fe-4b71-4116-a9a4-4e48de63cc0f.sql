-- Atualizar get_leads_stats para usar data_criacao_agendamento nos cards Agendados e Reagendar
-- Agendados: apenas etapa = 'Agendados' (não incluir 'Em agendamento')

CREATE OR REPLACE FUNCTION public.get_leads_stats(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL
)
RETURNS TABLE(
  total BIGINT,
  confirmados BIGINT,
  compareceram BIGINT,
  pendentes BIGINT,
  com_foto BIGINT,
  agendados BIGINT,
  reagendar BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    
    -- COMPARECERAM: Filtrado por 'criado'
    COUNT(*) FILTER (
      WHERE presenca_confirmada = true
        AND (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
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
    
    -- AGENDADOS: Filtrado por 'data_criacao_agendamento', apenas etapa 'Agendados'
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
    AND (p_scouter IS NULL OR scouter = p_scouter);
END;
$$;

COMMENT ON FUNCTION public.get_leads_stats IS 'Retorna estatísticas de leads. Cards Agendados e Reagendar usam data_criacao_agendamento, demais usam criado.';