-- Corrigir search_path na função de trigger
CREATE OR REPLACE FUNCTION auto_set_presenca_on_conversion()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Se tem date_closed e etapa é CONVERTED, marca presença
  IF NEW.date_closed IS NOT NULL 
     AND NEW.etapa IN ('CONVERTED', 'Lead convertido') 
  THEN
    NEW.presenca_confirmada = true;
  END IF;
  RETURN NEW;
END;
$$;