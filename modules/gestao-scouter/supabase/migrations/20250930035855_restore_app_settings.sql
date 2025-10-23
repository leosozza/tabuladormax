-- Restore app_settings table for IQS 2.0 configuration persistence
CREATE TABLE IF NOT EXISTS public.app_settings (
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

-- Create policies for public read access and authenticated write
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

-- Insert default settings if none exist
INSERT INTO public.app_settings (
  valor_base_ficha,
  quality_threshold,
  peso_foto,
  peso_confirmada,
  peso_contato,
  peso_agendado,
  peso_compareceu,
  peso_interesse,
  peso_concl_pos,
  peso_concl_neg,
  peso_sem_interesse_def,
  peso_sem_contato,
  peso_sem_interesse_momento,
  ajuda_custo_tier
)
SELECT 
  10.00,
  50.00,
  1.0,
  1.0,
  1.0,
  1.0,
  1.0,
  1.0,
  1.0,
  1.0,
  1.0,
  1.0,
  1.0,
  '{"bronze": 200, "prata": 250, "ouro": 300, "diamante": 350}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings LIMIT 1);
