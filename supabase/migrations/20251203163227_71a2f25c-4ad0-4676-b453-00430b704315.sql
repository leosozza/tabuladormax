-- Function to get unique project IDs from leads with optional filters
CREATE OR REPLACE FUNCTION public.get_unique_project_ids(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL,
  p_fonte TEXT DEFAULT NULL
)
RETURNS TABLE(commercial_project_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT l.commercial_project_id
  FROM leads l
  WHERE l.commercial_project_id IS NOT NULL
    AND (p_start_date IS NULL OR l.criado >= p_start_date)
    AND (p_end_date IS NULL OR l.criado <= p_end_date)
    AND (p_scouter IS NULL OR l.scouter = p_scouter)
    AND (p_fonte IS NULL OR l.fonte_normalizada = p_fonte);
END;
$$;