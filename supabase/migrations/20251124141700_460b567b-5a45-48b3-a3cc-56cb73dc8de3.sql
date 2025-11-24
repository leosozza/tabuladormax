-- Drop da função existente antes de recriar com nova assinatura
DROP FUNCTION IF EXISTS public.get_leads_stats(timestamp with time zone, timestamp with time zone, uuid, text);

-- Recriar função com novos campos (com_foto, agendados, reagendar)
CREATE FUNCTION public.get_leads_stats(
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
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE ficha_confirmada = true)::BIGINT as confirmados,
    COUNT(*) FILTER (WHERE presenca_confirmada = true)::BIGINT as compareceram,
    COUNT(*) FILTER (WHERE qualidade_lead IS NULL)::BIGINT as pendentes,
    COUNT(*) FILTER (WHERE cadastro_existe_foto = true)::BIGINT as com_foto,
    COUNT(*) FILTER (WHERE etapa = 'Agendado')::BIGINT as agendados,
    COUNT(*) FILTER (WHERE etapa = 'Reagendar')::BIGINT as reagendar
  FROM leads
  WHERE 
    (p_start_date IS NULL OR criado >= p_start_date)
    AND (p_end_date IS NULL OR criado <= p_end_date)
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter);
END;
$$;

COMMENT ON FUNCTION public.get_leads_stats IS 'Retorna estatísticas agregadas de leads com filtros opcionais. Inclui: total, confirmados, compareceram, pendentes, com_foto, agendados, reagendar';