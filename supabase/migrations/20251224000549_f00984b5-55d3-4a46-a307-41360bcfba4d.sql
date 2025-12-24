-- Adicionar nome_responsavel (campo 'name') na função get_scouter_leads_simple

DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  lead_id BIGINT,
  nome_modelo TEXT,
  nome_responsavel TEXT,
  criado TIMESTAMPTZ,
  celular TEXT,
  address TEXT,
  photo_url TEXT,
  phone_normalized TEXT,
  ficha_confirmada BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as lead_id,
    l.nome_modelo::TEXT,
    l.name::TEXT as nome_responsavel,
    l.criado,
    l.celular::TEXT,
    l.address::TEXT,
    l.photo_url::TEXT,
    l.phone_normalized::TEXT,
    l.ficha_confirmada
  FROM leads l
  WHERE l.scouter = p_scouter_name
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    AND (
      -- Todos os leads
      p_filter_type = 'all'
      
      -- Com Foto (sincronizado com stats)
      OR (p_filter_type = 'com_foto' AND 
          l.photo_url IS NOT NULL AND 
          l.photo_url != '' AND 
          l.photo_url != '[]')
      
      -- Confirmados (sincronizado com stats: usa data_confirmacao_ficha)
      OR (p_filter_type = 'confirmados' AND l.data_confirmacao_ficha IS NOT NULL)
      
      -- Agendados (sincronizado com stats)
      OR (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL)
      
      -- Reagendar (sincronizado com stats)
      OR (p_filter_type = 'reagendar' AND 
          (l.etapa_funil ILIKE '%reagendar%' OR l.status_fluxo ILIKE '%reagendar%'))
      
      -- Compareceram (sincronizado com stats)
      OR (p_filter_type = 'compareceram' AND l.compareceu = true)
      
      -- Pendentes (sincronizado com stats: usa data_confirmacao_ficha IS NULL)
      OR (p_filter_type = 'pendentes' AND l.data_confirmacao_ficha IS NULL)
      
      -- Duplicados (mesma lógica existente)
      OR (p_filter_type = 'duplicados' AND 
          l.phone_normalized IS NOT NULL AND 
          l.phone_normalized != '' AND
          LENGTH(l.phone_normalized) >= 8 AND
          EXISTS (
            SELECT 1 FROM leads other
            WHERE other.id != l.id
              AND other.phone_normalized = l.phone_normalized
              AND other.criado >= NOW() - INTERVAL '60 days'
          ))
    )
  ORDER BY l.criado DESC;
END;
$$;

COMMENT ON FUNCTION public.get_scouter_leads_simple IS 
'Retorna leads de um scouter com filtros sincronizados com get_scouter_portal_stats.
Filtros: all, com_foto, confirmados, agendados, reagendar, compareceram, pendentes, duplicados';