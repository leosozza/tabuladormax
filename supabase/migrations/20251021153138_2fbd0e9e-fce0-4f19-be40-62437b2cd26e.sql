-- Create table for storing field mapping presets
CREATE TABLE IF NOT EXISTS public.gestao_scouter_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  mappings JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gestao_scouter_field_mappings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all mapping presets"
  ON public.gestao_scouter_field_mappings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and managers can manage mapping presets"
  ON public.gestao_scouter_field_mappings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_gestao_scouter_field_mappings_updated_at
  BEFORE UPDATE ON public.gestao_scouter_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();