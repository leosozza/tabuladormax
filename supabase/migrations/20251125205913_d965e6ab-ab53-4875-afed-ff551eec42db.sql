-- Criar função de limpeza de histórico de localização
CREATE OR REPLACE FUNCTION public.cleanup_scouter_location_history()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  retention_days integer;
  deleted_count integer;
BEGIN
  -- Buscar configuração de retenção (padrão 30 dias)
  SELECT COALESCE((value::text)::integer, 30)
  INTO retention_days
  FROM config_kv
  WHERE key = 'scouter_location_retention_days';
  
  -- Se não encontrar, usar 30 dias como padrão
  IF retention_days IS NULL THEN
    retention_days := 30;
  END IF;
  
  -- Deletar registros mais antigos que o período configurado
  DELETE FROM scouter_location_history
  WHERE recorded_at < NOW() - (retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Inserir configuração padrão de retenção (30 dias)
INSERT INTO config_kv (key, value)
VALUES ('scouter_location_retention_days', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Função para obter estatísticas do histórico
CREATE OR REPLACE FUNCTION public.get_scouter_location_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_records', COUNT(*),
    'oldest_record', MIN(recorded_at),
    'newest_record', MAX(recorded_at),
    'unique_scouters', COUNT(DISTINCT scouter_bitrix_id)
  )
  INTO result
  FROM scouter_location_history;
  
  RETURN result;
END;
$$;