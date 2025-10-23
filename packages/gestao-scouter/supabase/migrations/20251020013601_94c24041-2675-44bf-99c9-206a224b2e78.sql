-- ============================================
-- Migration: Add Tinder Analysis Columns
-- ============================================

-- Add columns for Tinder-style analysis to leads table
DO $$ 
BEGIN
  -- Add aprovado column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'aprovado'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN aprovado BOOLEAN NULL;
  END IF;

  -- Add analisado_por column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'analisado_por'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN analisado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add analisado_em column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'analisado_em'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN analisado_em TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Create RPC to save Tinder analysis decision
CREATE OR REPLACE FUNCTION public.set_lead_analysis(
  p_lead_id BIGINT,
  p_aprovado BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET aprovado = p_aprovado,
      analisado_por = auth.uid(),
      analisado_em = NOW()
  WHERE id = p_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_lead_analysis(BIGINT, BOOLEAN) TO authenticated;