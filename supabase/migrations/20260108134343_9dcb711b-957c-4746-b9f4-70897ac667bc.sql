-- Create RPC to count filtered leads efficiently
CREATE OR REPLACE FUNCTION public.get_filtered_leads_count(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_scouter TEXT DEFAULT NULL,
  p_fonte TEXT DEFAULT NULL,
  p_with_photo BOOLEAN DEFAULT FALSE,
  p_search_term TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM leads l
  WHERE 
    -- Date filter
    (p_start_date IS NULL OR l.criado >= p_start_date)
    AND (p_end_date IS NULL OR l.criado <= p_end_date)
    -- Project filter
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    -- Scouter filter
    AND (p_scouter IS NULL OR l.scouter = p_scouter)
    -- Fonte filter
    AND (p_fonte IS NULL OR l.fonte_normalizada = p_fonte)
    -- Photo filter
    AND (
      p_with_photo = FALSE 
      OR (l.photo_url IS NOT NULL AND l.photo_url != '' AND l.photo_url != '[]')
    )
    -- Search term filter
    AND (
      p_search_term IS NULL 
      OR p_search_term = ''
      OR l.name ILIKE '%' || p_search_term || '%'
      OR l.nome_modelo ILIKE '%' || p_search_term || '%'
      OR (p_search_term ~ '^\d+$' AND l.id = p_search_term::INTEGER)
    );
  
  RETURN v_count;
END;
$$;