-- Dropar ambos os índices possíveis
DROP INDEX IF EXISTS idx_mv_whatsapp_stats_phone_bitrix;
DROP INDEX IF EXISTS mv_whatsapp_conversation_stats_phone_number_bitrix_id_idx;

-- Recriar índice único com tratamento de NULL usando COALESCE
CREATE UNIQUE INDEX idx_mv_whatsapp_stats_phone_bitrix 
ON mv_whatsapp_conversation_stats (phone_number, COALESCE(bitrix_id, ''));

-- Atualizar função de refresh com fallback para evitar falhas futuras
CREATE OR REPLACE FUNCTION refresh_whatsapp_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tentar refresh concurrent primeiro (mais rápido, não bloqueia leitura)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_whatsapp_conversation_stats;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar, fazer refresh normal (bloqueia mas funciona)
    RAISE NOTICE 'Concurrent refresh failed, doing full refresh: %', SQLERRM;
    REFRESH MATERIALIZED VIEW mv_whatsapp_conversation_stats;
  END;
END;
$$;

-- Forçar refresh imediato para atualizar os dados
REFRESH MATERIALIZED VIEW mv_whatsapp_conversation_stats;