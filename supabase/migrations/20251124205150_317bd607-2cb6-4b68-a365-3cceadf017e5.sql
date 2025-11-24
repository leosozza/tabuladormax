-- 1. Criar nova coluna date_closed e indexes
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS date_closed timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_leads_date_closed ON leads(date_closed);
CREATE INDEX IF NOT EXISTS idx_leads_date_closed_etapa ON leads(date_closed, etapa);

-- 2. Popular dados históricos do JSON raw (filtrar strings vazias)
UPDATE leads 
SET date_closed = (raw->>'DATE_CLOSED')::timestamptz
WHERE raw->>'DATE_CLOSED' IS NOT NULL
  AND raw->>'DATE_CLOSED' != ''
  AND date_closed IS NULL;

-- 3. Criar função para sincronizar presenca_confirmada
CREATE OR REPLACE FUNCTION auto_set_presenca_on_conversion()
RETURNS trigger AS $$
BEGIN
  -- Se tem date_closed e etapa é CONVERTED, marca presença
  IF NEW.date_closed IS NOT NULL 
     AND NEW.etapa IN ('CONVERTED', 'Lead convertido') 
  THEN
    NEW.presenca_confirmada = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger
DROP TRIGGER IF EXISTS set_presenca_on_lead_conversion ON leads;
CREATE TRIGGER set_presenca_on_lead_conversion
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_presenca_on_conversion();

-- 5. Atualizar presenca_confirmada em dados existentes
UPDATE leads 
SET presenca_confirmada = true, updated_at = NOW()
WHERE etapa IN ('CONVERTED', 'Lead convertido')
  AND date_closed IS NOT NULL
  AND (presenca_confirmada IS NULL OR presenca_confirmada = false);

-- 6. Atualizar função get_leads_stats
CREATE OR REPLACE FUNCTION public.get_leads_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL
)
RETURNS TABLE(
  total bigint,
  confirmados bigint,
  compareceram bigint,
  pendentes bigint,
  com_foto bigint,
  agendados bigint,
  reagendar bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    AND (p_scouter IS NULL OR scouter = p_scouter);
END;
$$;

-- 7. Atualizar função get_general_stats
CREATE OR REPLACE FUNCTION public.get_general_stats()
RETURNS TABLE(
  total_leads bigint,
  confirmados bigint,
  compareceram bigint,
  valor_total numeric,
  leads_hoje bigint,
  leads_semana bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(l.id) as total_leads,
    COUNT(l.id) FILTER (WHERE l.ficha_confirmada = true) as confirmados,
    -- Compareceram: etapa CONVERTED + date_closed preenchido
    COUNT(l.id) FILTER (
      WHERE l.etapa IN ('CONVERTED', 'Lead convertido')
        AND l.date_closed IS NOT NULL
    ) as compareceram,
    COALESCE(SUM(l.valor_ficha), 0) as valor_total,
    COUNT(l.id) FILTER (WHERE l.criado::date = CURRENT_DATE) as leads_hoje,
    COUNT(l.id) FILTER (WHERE l.criado::date >= CURRENT_DATE - INTERVAL '7 days') as leads_semana
  FROM leads l;
END;
$$;

-- 8. Atualizar função get_source_analysis
CREATE OR REPLACE FUNCTION public.get_source_analysis(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS TABLE(
  fonte_normalizada text,
  total bigint,
  confirmados bigint,
  compareceram bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(l.fonte_normalizada, 'Outros') as fonte_normalizada,
    COUNT(l.id) FILTER (
      WHERE (p_start_date IS NULL OR l.criado >= p_start_date)
        AND (p_end_date IS NULL OR l.criado <= p_end_date)
    ) as total,
    COUNT(l.id) FILTER (
      WHERE l.ficha_confirmada = true
        AND (p_start_date IS NULL OR l.criado >= p_start_date)
        AND (p_end_date IS NULL OR l.criado <= p_end_date)
    ) as confirmados,
    -- Compareceram: filtrado por date_closed
    COUNT(l.id) FILTER (
      WHERE l.etapa IN ('CONVERTED', 'Lead convertido')
        AND l.date_closed IS NOT NULL
        AND (p_start_date IS NULL OR l.date_closed >= p_start_date)
        AND (p_end_date IS NULL OR l.date_closed <= p_end_date)
    ) as compareceram
  FROM leads l
  WHERE 
    (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR l.scouter = p_scouter)
    AND (p_fonte IS NULL OR l.fonte_normalizada = p_fonte)
  GROUP BY fonte_normalizada
  ORDER BY total DESC;
END;
$$;

-- 9. Atualizar função get_leads_chart_data
CREATE OR REPLACE FUNCTION public.get_leads_chart_data(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', date_trunc('day', criado)::date,
        'total', COUNT(*),
        'confirmados', COUNT(*) FILTER (WHERE ficha_confirmada = true),
        'compareceram', COUNT(*) FILTER (
          WHERE etapa IN ('CONVERTED', 'Lead convertido')
            AND date_closed IS NOT NULL
            AND date_closed >= p_start_date
            AND date_closed <= p_end_date
        )
      )
      ORDER BY date_trunc('day', criado)
    )
    FROM leads
    WHERE criado >= p_start_date
      AND criado <= p_end_date
      AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
      AND (p_scouter IS NULL OR scouter = p_scouter)
      AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
    GROUP BY date_trunc('day', criado)
  );
END;
$$;

-- 10. Atualizar função get_conversion_funnel_data
CREATE OR REPLACE FUNCTION public.get_conversion_funnel_data(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total', COUNT(*) FILTER (
        WHERE (p_start_date IS NULL OR criado >= p_start_date)
          AND (p_end_date IS NULL OR criado <= p_end_date)
      ),
      'confirmados', COUNT(*) FILTER (
        WHERE ficha_confirmada = true
          AND (p_start_date IS NULL OR criado >= p_start_date)
          AND (p_end_date IS NULL OR criado <= p_end_date)
      ),
      'compareceram', COUNT(*) FILTER (
        WHERE etapa IN ('CONVERTED', 'Lead convertido')
          AND date_closed IS NOT NULL
          AND (p_start_date IS NULL OR date_closed >= p_start_date)
          AND (p_end_date IS NULL OR date_closed <= p_end_date)
      )
    )
    FROM leads
    WHERE (p_project_id IS NULL OR commercial_project_id = p_project_id)
      AND (p_scouter IS NULL OR scouter = p_scouter)
      AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
  );
END;
$$;

-- 11. Atualizar função get_scouter_performance_data
CREATE OR REPLACE FUNCTION public.get_scouter_performance_data(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'scouter', COALESCE(scouter, 'Sem scouter'),
        'total', total,
        'confirmados', confirmados,
        'compareceram', compareceram
      )
      ORDER BY total DESC
    )
    FROM (
      SELECT 
        scouter,
        COUNT(*) FILTER (
          WHERE (p_start_date IS NULL OR criado >= p_start_date)
            AND (p_end_date IS NULL OR criado <= p_end_date)
        ) as total,
        COUNT(*) FILTER (
          WHERE ficha_confirmada = true
            AND (p_start_date IS NULL OR criado >= p_start_date)
            AND (p_end_date IS NULL OR criado <= p_end_date)
        ) as confirmados,
        COUNT(*) FILTER (
          WHERE etapa IN ('CONVERTED', 'Lead convertido')
            AND date_closed IS NOT NULL
            AND (p_start_date IS NULL OR date_closed >= p_start_date)
            AND (p_end_date IS NULL OR date_closed <= p_end_date)
        ) as compareceram
      FROM leads
      WHERE scouter IS NOT NULL
        AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
        AND (p_scouter IS NULL OR scouter = p_scouter)
        AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
      GROUP BY scouter
      ORDER BY total DESC
      LIMIT p_limit
    ) sub
  );
END;
$$;

-- 12. Atualizar função get_status_distribution_data
CREATE OR REPLACE FUNCTION public.get_status_distribution_data(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL,
  p_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', etapa,
        'value', count
      )
      ORDER BY count DESC
    )
    FROM (
      SELECT 
        COALESCE(etapa, 'Sem etapa') as etapa,
        COUNT(*) as count
      FROM leads
      WHERE (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
        AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
        AND (p_scouter IS NULL OR scouter = p_scouter)
        AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
      GROUP BY etapa
      ORDER BY count DESC
      LIMIT p_limit
    ) sub
  );
END;
$$;