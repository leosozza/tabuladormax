-- 1. Atualizar função normalize_fonte para usar "Scouter - Fichas"
CREATE OR REPLACE FUNCTION public.normalize_fonte(raw_fonte text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
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
    RETURN 'Scouter - Fichas';
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
$function$;

-- 2. Atualizar field_mappings para fonte_normalizada ser padrão
UPDATE public.field_mappings
SET 
  display_name = 'Fonte',
  default_visible = true
WHERE supabase_field = 'fonte_normalizada';

-- 3. Atualizar field_mappings para fonte ser secundária
UPDATE public.field_mappings
SET 
  display_name = 'Fonte (Bruta)',
  default_visible = false
WHERE supabase_field = 'fonte';