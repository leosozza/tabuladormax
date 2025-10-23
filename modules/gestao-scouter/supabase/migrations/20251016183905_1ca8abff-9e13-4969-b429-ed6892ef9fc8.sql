-- Create app_settings table for application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_tile_server TEXT DEFAULT 'openstreetmap',
  enable_offline_mode BOOLEAN DEFAULT false,
  auto_sync_interval INTEGER DEFAULT 300,
  max_file_size_mb INTEGER DEFAULT 300,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage settings
CREATE POLICY "Admins can manage app settings"
ON public.app_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to view settings
CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO public.app_settings (
  default_tile_server,
  enable_offline_mode,
  auto_sync_interval,
  max_file_size_mb
) VALUES (
  'openstreetmap',
  false,
  300,
  300
) ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();