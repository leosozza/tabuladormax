-- Create table for button categories
CREATE TABLE public.button_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.button_categories ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view categories
CREATE POLICY "All authenticated users can view categories"
ON public.button_categories
FOR SELECT
USING (true);

-- Managers and admins can manage categories
CREATE POLICY "Managers and admins can manage categories"
ON public.button_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Insert default categories
INSERT INTO public.button_categories (name, label, sort_order) VALUES
  ('AGENDAR', 'Agendar', 1),
  ('RETORNAR', 'Retornar', 2),
  ('NAO_AGENDADO', 'Não Agendado', 3);

-- Add trigger for updated_at
CREATE TRIGGER update_button_categories_updated_at
BEFORE UPDATE ON public.button_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();