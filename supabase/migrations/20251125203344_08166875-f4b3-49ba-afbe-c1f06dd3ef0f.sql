-- Create table for scouter location history
CREATE TABLE IF NOT EXISTS public.scouter_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scouter_bitrix_id INTEGER NOT NULL,
  scouter_name TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  address TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_scouter_location_history_scouter_id ON public.scouter_location_history(scouter_bitrix_id);
CREATE INDEX idx_scouter_location_history_recorded_at ON public.scouter_location_history(recorded_at DESC);
CREATE INDEX idx_scouter_location_history_scouter_recorded ON public.scouter_location_history(scouter_bitrix_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.scouter_location_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can view location history"
  ON public.scouter_location_history
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Service role can insert location history"
  ON public.scouter_location_history
  FOR INSERT
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE public.scouter_location_history IS 'Histórico de localizações dos scouters em tempo real via Bitrix SPA 1096';