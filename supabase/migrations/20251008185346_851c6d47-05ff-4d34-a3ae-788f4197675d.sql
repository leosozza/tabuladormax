-- Add is_profile_photo column to profile_field_mapping table
ALTER TABLE public.profile_field_mapping 
ADD COLUMN is_profile_photo BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.profile_field_mapping.is_profile_photo IS 'Indica se este campo contém a URL da foto de perfil';

-- Ensure only one field can be marked as profile photo at a time
CREATE OR REPLACE FUNCTION public.check_single_profile_photo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_profile_photo = true THEN
    -- Desmarcar qualquer outro campo marcado como foto de perfil
    UPDATE public.profile_field_mapping
    SET is_profile_photo = false
    WHERE id != NEW.id AND is_profile_photo = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single profile photo
DROP TRIGGER IF EXISTS ensure_single_profile_photo ON public.profile_field_mapping;
CREATE TRIGGER ensure_single_profile_photo
  BEFORE INSERT OR UPDATE ON public.profile_field_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_profile_photo();