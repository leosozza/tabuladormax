-- Criar função para processar um único lote de fonte_normalizada
CREATE OR REPLACE FUNCTION public.recalculate_fonte_single_batch(p_batch_size INT DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INT;
BEGIN
  -- Atualizar um lote de leads onde fonte_normalizada está diferente do normalizado
  WITH batch AS (
    SELECT id FROM leads
    WHERE fonte_normalizada IS DISTINCT FROM normalize_fonte(fonte)
    LIMIT p_batch_size
  )
  UPDATE leads l
  SET updated_at = NOW()
  FROM batch b
  WHERE l.id = b.id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Retornar quantos foram atualizados e se há mais para processar
  RETURN jsonb_build_object(
    'updated', v_updated,
    'has_more', v_updated = p_batch_size
  );
END;
$function$;