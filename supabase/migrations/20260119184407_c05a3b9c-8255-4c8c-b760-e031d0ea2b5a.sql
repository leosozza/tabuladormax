-- Corrigir RPC get_scouter_portal_stats para usar lógica correta de pendentes
-- Pendentes = leads NÃO confirmados (nem ficha_confirmada, nem data_confirmacao_ficha)
-- Confirmados = ficha_confirmada = true OU data_confirmacao_ficha IS NOT NULL

DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name text,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_project_code text DEFAULT NULL
)
RETURNS TABLE(
  total_leads bigint,
  com_foto bigint,
  confirmados bigint,
  agendados bigint,
  reagendar bigint,
  compareceram bigint,
  pendentes bigint,
  duplicados bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_leads,
    
    -- Com foto: exclui arrays vazios
    COUNT(*) FILTER (WHERE 
      l.photo_url IS NOT NULL 
      AND l.photo_url <> '' 
      AND l.photo_url <> '[]'
    )::bigint AS com_foto,
    
    -- Confirmados: ficha_confirmada = true OU data_confirmacao_ficha preenchida
    COUNT(*) FILTER (WHERE 
      COALESCE(l.ficha_confirmada, false) = true 
      OR l.data_confirmacao_ficha IS NOT NULL
    )::bigint AS confirmados,
    
    -- Agendados: qualquer status de agendamento
    COUNT(*) FILTER (WHERE 
      l.status_tabulacao IN ('Agendado', 'Agendado-Confirmado', 'Agendado-WhatsApp')
      OR l.data_agendamento IS NOT NULL
    )::bigint AS agendados,
    
    -- Reagendar
    COUNT(*) FILTER (WHERE l.status_tabulacao = 'Reagendar')::bigint AS reagendar,
    
    -- Compareceram
    COUNT(*) FILTER (WHERE 
      l.status_tabulacao = 'Compareceu' 
      OR COALESCE(l.compareceu, false) = true
    )::bigint AS compareceram,
    
    -- Pendentes: NÃO confirmados (nem por boolean, nem por data)
    COUNT(*) FILTER (WHERE 
      COALESCE(l.ficha_confirmada, false) = false 
      AND l.data_confirmacao_ficha IS NULL
    )::bigint AS pendentes,
    
    -- Duplicados (mantém 0 por enquanto)
    0::bigint AS duplicados
    
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND l.fonte = 'Scouter - Fichas'
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_code IS NULL OR l.projeto_comercial = p_project_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scouter_portal_stats(text, timestamptz, timestamptz, text) TO authenticated;