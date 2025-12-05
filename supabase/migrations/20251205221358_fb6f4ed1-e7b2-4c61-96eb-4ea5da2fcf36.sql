CREATE OR REPLACE FUNCTION get_scouter_ranking_position(
  p_scouter_name TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  rank_position BIGINT,
  total_scouters BIGINT,
  scouter_fichas BIGINT,
  first_place_name TEXT,
  first_place_fichas BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranking AS (
    SELECT 
      l.scouter,
      COUNT(*) as fichas,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as pos
    FROM leads l
    WHERE l.scouter IS NOT NULL
      AND (p_start_date IS NULL OR l.criado >= p_start_date)
      AND (p_end_date IS NULL OR l.criado <= p_end_date)
    GROUP BY l.scouter
  ),
  first_place AS (
    SELECT r.scouter, r.fichas FROM ranking r WHERE r.pos = 1
  )
  SELECT 
    r.pos::BIGINT as rank_position,
    (SELECT COUNT(DISTINCT r2.scouter) FROM ranking r2)::BIGINT as total_scouters,
    r.fichas::BIGINT as scouter_fichas,
    fp.scouter as first_place_name,
    fp.fichas::BIGINT as first_place_fichas
  FROM ranking r
  CROSS JOIN first_place fp
  WHERE r.scouter = p_scouter_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;