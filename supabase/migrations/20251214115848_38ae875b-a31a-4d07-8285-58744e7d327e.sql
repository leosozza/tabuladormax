-- Remover TODAS as versões duplicadas da função
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT);

-- Recriar função ÚNICA com tipagem correta
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  celular TEXT,
  criado TIMESTAMPTZ,
  etapa TEXT,
  ficha_confirmada BOOLEAN,
  ficha_paga BOOLEAN,
  valor_ficha NUMERIC,
  photo_url TEXT,
  project_name TEXT,
  project_code TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.celular,
    l.criado,
    l.etapa,
    l.ficha_confirmada,
    l.ficha_paga,
    l.valor_ficha,
    l.photo_url,
    cp.name as project_name,
    cp.code as project_code
  FROM leads l
  LEFT JOIN commercial_projects cp ON l.commercial_project_id = cp.id
  WHERE l.scouter = p_scouter_name
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    AND (
      p_filter_type = 'all'
      OR (p_filter_type = 'confirmadas' AND l.ficha_confirmada = true)
      OR (p_filter_type = 'pendentes' AND (l.ficha_confirmada IS NULL OR l.ficha_confirmada = false))
      OR (p_filter_type = 'pagas' AND l.ficha_paga = true)
      OR (p_filter_type = 'duplicados' AND 
        l.phone_normalized IS NOT NULL AND 
        l.phone_normalized != '' AND
        LENGTH(l.phone_normalized) >= 8 AND
        EXISTS (
          SELECT 1 FROM leads other
          WHERE other.id != l.id
            AND other.phone_normalized = l.phone_normalized
            AND other.criado >= NOW() - INTERVAL '60 days'
        )
      )
    )
  ORDER BY l.criado DESC;
END;
$$;