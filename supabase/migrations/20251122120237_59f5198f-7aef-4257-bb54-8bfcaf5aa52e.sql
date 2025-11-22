-- Create RPC function for retroactive payment preview with aggregation
CREATE OR REPLACE FUNCTION get_retroactive_payment_preview(
  p_cutoff_date date,
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count bigint;
  v_total_value numeric;
BEGIN
  SELECT 
    COUNT(*),
    COALESCE(SUM(valor_ficha), 0)
  INTO v_count, v_total_value
  FROM leads
  WHERE 
    criado::date <= p_cutoff_date
    AND (ficha_paga IS NOT TRUE OR ficha_paga IS NULL)
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter)
    AND scouter IS NOT NULL
    AND valor_ficha IS NOT NULL;
  
  RETURN jsonb_build_object(
    'count', v_count,
    'total_value', v_total_value
  );
END;
$$;