-- Função para limpar dados corrompidos de fonte
CREATE OR REPLACE FUNCTION public.clean_corrupted_fonte()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cleaned INT;
BEGIN
  UPDATE leads 
  SET fonte = 'Sem Fonte'
  WHERE fonte ~ '^\d{2}/\d{2}/\d{4}' OR fonte = 'quot';
  
  GET DIAGNOSTICS v_cleaned = ROW_COUNT;
  
  RETURN jsonb_build_object('cleaned', v_cleaned);
END;
$$;

-- Função para recalcular fonte_normalizada em lotes
CREATE OR REPLACE FUNCTION public.recalculate_fonte_batch()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_size INT := 5000;
  v_total_updated INT := 0;
  v_batch_updated INT;
BEGIN
  LOOP
    -- Atualizar um lote
    WITH batch AS (
      SELECT id FROM leads
      WHERE fonte_normalizada IS DISTINCT FROM normalize_fonte(fonte)
      LIMIT v_batch_size
    )
    UPDATE leads l
    SET updated_at = NOW()
    FROM batch b
    WHERE l.id = b.id;
    
    GET DIAGNOSTICS v_batch_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_batch_updated;
    
    -- Parar se não há mais registros
    EXIT WHEN v_batch_updated = 0;
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_updated', v_total_updated
  );
END;
$$;