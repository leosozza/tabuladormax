-- Corrigir função para adicionar search_path
CREATE OR REPLACE FUNCTION update_gupshup_templates_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;