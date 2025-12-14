-- Função para popular phone_normalized em batches
CREATE OR REPLACE FUNCTION populate_phone_normalized_batch(p_batch_size INTEGER DEFAULT 5000)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  WITH batch AS (
    SELECT id FROM leads
    WHERE phone_normalized IS NULL
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE leads l
  SET phone_normalized = normalize_phone_number(l.celular, l.raw->'PHONE')
  FROM batch b
  WHERE l.id = b.id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'updated', v_updated,
    'has_more', v_updated = p_batch_size
  );
END;
$$;