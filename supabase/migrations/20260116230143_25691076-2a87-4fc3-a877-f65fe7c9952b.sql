-- Fix type mismatch: cast numeric to double precision
CREATE OR REPLACE FUNCTION get_scouter_location_history(
  p_scouter_bitrix_id integer,
  p_date_from timestamptz,
  p_date_to timestamptz,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  latitude double precision,
  longitude double precision,
  address text,
  recorded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    slh.latitude::double precision,
    slh.longitude::double precision,
    slh.address,
    slh.recorded_at
  FROM scouter_location_history slh
  WHERE slh.scouter_bitrix_id = p_scouter_bitrix_id
    AND slh.recorded_at >= p_date_from
    AND slh.recorded_at <= p_date_to
  ORDER BY slh.recorded_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_scouter_location_history IS 'Busca histórico de localização do scouter por bitrix_id. Usa SECURITY DEFINER para bypass RLS no Portal do Scouter.';