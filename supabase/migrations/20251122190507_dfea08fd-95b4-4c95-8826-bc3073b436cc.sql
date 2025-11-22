-- Corrigir avisos de segurança: adicionar search_path às funções

-- Recriar normalize_fonte com search_path
CREATE OR REPLACE FUNCTION normalize_fonte(raw_fonte text)
RETURNS text AS $$
BEGIN
  IF raw_fonte IS NULL OR raw_fonte = '' THEN
    RETURN 'Sem Fonte';
  END IF;
  
  IF raw_fonte ILIKE '%meta%' 
     OR raw_fonte ILIKE '%instagram%' 
     OR raw_fonte ILIKE '%facebook%' THEN
    RETURN 'Meta';
  END IF;
  
  IF raw_fonte ILIKE '%scouter%' 
     OR raw_fonte ILIKE '%fichas%' THEN
    RETURN 'Scouters';
  END IF;
  
  IF raw_fonte ILIKE '%maxsystem%'
     OR raw_fonte ILIKE '%importa%' THEN
    RETURN 'MaxSystem';
  END IF;
  
  IF raw_fonte ILIKE '%recep%' THEN
    RETURN 'Recepção';
  END IF;
  
  IF raw_fonte ILIKE 'UC_%'
     OR raw_fonte ILIKE '%openline%' 
     OR raw_fonte ~ '^[0-9]+\|OPENLINE' THEN
    RETURN 'OpenLine';
  END IF;
  
  IF raw_fonte = 'CALL' OR raw_fonte ILIKE '%call%' THEN
    RETURN 'Chamadas';
  END IF;
  
  IF raw_fonte = 'WEBFORM' OR raw_fonte ILIKE '%webform%' OR raw_fonte ILIKE '%formul%' THEN
    RETURN 'Formulário Web';
  END IF;
  
  IF raw_fonte ~ '^[0-9]+$'
     OR raw_fonte ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
     OR LENGTH(raw_fonte) < 3
     OR raw_fonte IN ('quot', 'null', 'undefined') THEN
    RETURN 'Sem Fonte';
  END IF;
  
  RETURN raw_fonte;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public';

-- Recriar get_normalized_fontes com search_path
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

-- Recriar get_source_analysis com search_path
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';