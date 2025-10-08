-- Add display_name column to profile_field_mapping
ALTER TABLE public.profile_field_mapping 
ADD COLUMN IF NOT EXISTS display_name text;

-- Update existing records with default display names
UPDATE public.profile_field_mapping SET display_name = 'Nome' WHERE profile_field = 'name' AND display_name IS NULL;
UPDATE public.profile_field_mapping SET display_name = 'Responsável' WHERE profile_field = 'responsible' AND display_name IS NULL;
UPDATE public.profile_field_mapping SET display_name = 'Idade' WHERE profile_field = 'age' AND display_name IS NULL;
UPDATE public.profile_field_mapping SET display_name = 'Endereço' WHERE profile_field = 'address' AND display_name IS NULL;
UPDATE public.profile_field_mapping SET display_name = 'Scouter' WHERE profile_field = 'scouter' AND display_name IS NULL;
UPDATE public.profile_field_mapping SET display_name = 'Foto' WHERE profile_field = 'photo' AND display_name IS NULL;