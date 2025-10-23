-- Create app_settings table for parameter persistence
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valor_base_ficha DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  quality_threshold DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  peso_foto DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_confirmada DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_contato DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_agendado DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_compareceu DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_interesse DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_concl_pos DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_concl_neg DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_sem_interesse_def DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_sem_contato DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  peso_sem_interesse_momento DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  ajuda_custo_tier JSONB NOT NULL DEFAULT '{"bronze": 200, "prata": 250, "ouro": 300, "diamante": 350}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update app settings" 
ON public.app_settings 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (
  valor_base_ficha,
  quality_threshold,
  ajuda_custo_tier
) VALUES (
  15.00,
  60.00,
  '{"bronze": 200, "prata": 250, "ouro": 300, "diamante": 350}'
);