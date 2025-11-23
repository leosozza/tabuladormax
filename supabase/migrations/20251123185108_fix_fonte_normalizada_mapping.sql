-- ============================================
-- Migration: Fix fonte_normalizada mapping
-- Purpose: Correct the normalize_fonte() function to properly map technical values to friendly names
-- ============================================

-- Update normalize_fonte function with corrected mappings
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
  
  -- Scouters (corrigido para "Scouter - Fichas")
  IF raw_fonte ILIKE '%scouter%' 
     OR raw_fonte ILIKE '%fichas%' THEN
    RETURN 'Scouter - Fichas';
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
  
  -- Chamadas telefônicas (corrigido para incluir "CALL" e "chamadas")
  IF raw_fonte = 'CALL' 
     OR raw_fonte ILIKE '%call%' 
     OR raw_fonte ILIKE '%chamadas%' THEN
    RETURN 'Chamadas';
  END IF;
  
  -- Formulários web
  IF raw_fonte = 'WEBFORM' 
     OR raw_fonte ILIKE '%webform%' 
     OR raw_fonte ILIKE '%formul%' THEN
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

-- Drop and recreate the fonte_normalizada column to regenerate all values
ALTER TABLE leads DROP COLUMN IF EXISTS fonte_normalizada;
ALTER TABLE leads 
  ADD COLUMN fonte_normalizada text 
  GENERATED ALWAYS AS (normalize_fonte(fonte)) STORED;

-- Recreate index for performance
CREATE INDEX IF NOT EXISTS idx_leads_fonte_normalizada 
ON leads(fonte_normalizada);

-- Update function comment
COMMENT ON FUNCTION normalize_fonte IS 'Normaliza códigos técnicos de fonte para nomes amigáveis. Corrigido em 2025-11-23 para mapear CALL→Chamadas e scouter/fichas→Scouter - Fichas';
