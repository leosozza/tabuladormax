-- ============================================
-- FASE 1: Criar função normalize_fonte melhorada
-- ============================================
CREATE OR REPLACE FUNCTION normalize_fonte(raw_fonte text)
RETURNS text AS $$
BEGIN
  -- Tratar valores nulos ou vazios
  IF raw_fonte IS NULL OR raw_fonte = '' THEN
    RETURN 'Sem Fonte';
  END IF;
  
  -- Meta (Facebook, Instagram)
  IF raw_fonte ILIKE '%meta%' 
     OR raw_fonte ILIKE '%instagram%' 
     OR raw_fonte ILIKE '%facebook%' THEN
    RETURN 'Meta';
  END IF;
  
  -- Scouters
  IF raw_fonte ILIKE '%scouter%' 
     OR raw_fonte ILIKE '%fichas%' THEN
    RETURN 'Scouters';
  END IF;
  
  -- MaxSystem (todos os tipos incluindo importação)
  IF raw_fonte ILIKE '%maxsystem%'
     OR raw_fonte ILIKE '%importa%' THEN
    RETURN 'MaxSystem';
  END IF;
  
  -- Recepção
  IF raw_fonte ILIKE '%recep%' THEN
    RETURN 'Recepção';
  END IF;
  
  -- OpenLine (códigos UC_* e OPENLINE)
  IF raw_fonte ILIKE 'UC_%'
     OR raw_fonte ILIKE '%openline%' 
     OR raw_fonte ~ '^[0-9]+\|OPENLINE' THEN
    RETURN 'OpenLine';
  END IF;
  
  -- Chamadas telefônicas
  IF raw_fonte = 'CALL' OR raw_fonte ILIKE '%call%' THEN
    RETURN 'Chamadas';
  END IF;
  
  -- Formulários web
  IF raw_fonte = 'WEBFORM' OR raw_fonte ILIKE '%webform%' OR raw_fonte ILIKE '%formul%' THEN
    RETURN 'Formulário Web';
  END IF;
  
  -- Filtrar lixo (números puros, datas, strings muito curtas, caracteres estranhos)
  IF raw_fonte ~ '^[0-9]+$'                          -- Apenas números
     OR raw_fonte ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'    -- Datas
     OR LENGTH(raw_fonte) < 3                         -- Muito curto
     OR raw_fonte IN ('quot', 'null', 'undefined') THEN
    RETURN 'Sem Fonte';
  END IF;
  
  -- Retornar valor original se não encaixar em nenhuma categoria
  RETURN raw_fonte;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FASE 2: Adicionar coluna computed fonte_normalizada
-- ============================================
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS fonte_normalizada text 
GENERATED ALWAYS AS (normalize_fonte(fonte)) STORED;

-- Criar index para performance
CREATE INDEX IF NOT EXISTS idx_leads_fonte_normalizada 
ON leads(fonte_normalizada);

-- ============================================
-- FASE 3: Criar RPC get_normalized_fontes
-- ============================================
CREATE OR REPLACE FUNCTION get_normalized_fontes(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL
)
RETURNS TABLE(fonte_normalizada text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT l.fonte_normalizada
  FROM leads l
  WHERE 
    (p_start_date IS NULL OR l.criado >= p_start_date)
    AND (p_end_date IS NULL OR l.criado <= p_end_date)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR l.scouter = p_scouter)
    AND l.fonte_normalizada IS NOT NULL
  ORDER BY l.fonte_normalizada;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- FASE 4: Criar RPC get_source_analysis
-- ============================================
CREATE OR REPLACE FUNCTION get_source_analysis(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL,
  p_fonte text DEFAULT NULL
)
RETURNS TABLE(
  fonte_normalizada text,
  total bigint,
  confirmados bigint,
  compareceram bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.fonte_normalizada,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE l.ficha_confirmada = true) as confirmados,
    COUNT(*) FILTER (WHERE l.compareceu = true) as compareceram
  FROM leads l
  WHERE 
    (p_start_date IS NULL OR l.criado >= p_start_date)
    AND (p_end_date IS NULL OR l.criado <= p_end_date)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR l.scouter = p_scouter)
    AND (p_fonte IS NULL OR l.fonte_normalizada = p_fonte)
  GROUP BY l.fonte_normalizada
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION normalize_fonte IS 'Normaliza códigos técnicos de fonte para nomes amigáveis';
COMMENT ON FUNCTION get_normalized_fontes IS 'Retorna lista de fontes normalizadas com filtros dinâmicos';
COMMENT ON FUNCTION get_source_analysis IS 'Retorna análise de performance por fonte normalizada';