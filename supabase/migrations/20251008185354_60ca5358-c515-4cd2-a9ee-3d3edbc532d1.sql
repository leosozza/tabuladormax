-- Fix search_path for check_single_profile_photo function
CREATE OR REPLACE FUNCTION public.check_single_profile_photo()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_profile_photo = true THEN
    -- Desmarcar qualquer outro campo marcado como foto de perfil
    UPDATE public.profile_field_mapping
    SET is_profile_photo = false
    WHERE id != NEW.id AND is_profile_photo = true;
  END IF;
  RETURN NEW;
END;
$$;