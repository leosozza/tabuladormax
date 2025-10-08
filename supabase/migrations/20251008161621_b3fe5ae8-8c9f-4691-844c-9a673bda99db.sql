-- Create table for profile field mapping
CREATE TABLE IF NOT EXISTS public.profile_field_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_field text NOT NULL UNIQUE,
  chatwoot_field text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_field_mapping ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write
CREATE POLICY "Enable all access for profile_field_mapping"
ON public.profile_field_mapping
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default mappings
INSERT INTO public.profile_field_mapping (profile_field, chatwoot_field) VALUES
  ('name', 'contact.name'),
  ('phone', 'contact.phone_number'),
  ('email', 'contact.email'),
  ('age', 'contact.custom_attributes.age'),
  ('address', 'contact.custom_attributes.address'),
  ('responsible', 'contact.custom_attributes.responsible'),
  ('scouter', 'contact.custom_attributes.scouter')
ON CONFLICT (profile_field) DO NOTHING;