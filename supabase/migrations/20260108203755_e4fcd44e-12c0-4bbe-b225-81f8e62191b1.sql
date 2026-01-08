-- Add public read policy for profile_field_mapping
-- This table contains non-sensitive configuration data (field names and layout)
CREATE POLICY "Allow public read access to profile field mappings"
ON public.profile_field_mapping
FOR SELECT
USING (true);