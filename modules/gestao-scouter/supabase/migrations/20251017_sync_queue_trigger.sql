-- Trigger para sincronização automática quando fichas são modificadas
-- Este trigger notifica o sistema quando há alterações em fichas que precisam ser sincronizadas

-- Tabela de fila de sincronização
CREATE TABLE IF NOT EXISTS sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id BIGINT NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  sync_direction TEXT NOT NULL DEFAULT 'gestao_to_tabulador',
  payload jsonb NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_ficha ON sync_queue(ficha_id);

-- Função que adiciona registros à fila de sincronização
CREATE OR REPLACE FUNCTION queue_ficha_for_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Evitar loops: não adicionar à fila se a alteração veio do TabuladorMax
  IF NEW.sync_source = 'TabuladorMax' AND 
     NEW.last_synced_at IS NOT NULL AND 
     NOW() - NEW.last_synced_at < INTERVAL '1 minute' THEN
    RETURN NEW;
  END IF;

  -- Adicionar à fila de sincronização
  INSERT INTO sync_queue (ficha_id, operation, payload, sync_direction)
  VALUES (
    NEW.id,
    TG_OP,
    row_to_json(NEW),
    'gestao_to_tabulador'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT/UPDATE em fichas
CREATE TRIGGER fichas_sync_trigger
AFTER INSERT OR UPDATE ON fichas
FOR EACH ROW
WHEN (NEW.deleted = FALSE) -- Apenas fichas não deletadas
EXECUTE FUNCTION queue_ficha_for_sync();

-- Função para processar fila de sincronização
-- Esta função deve ser chamada periodicamente por um cron job ou edge function
CREATE OR REPLACE FUNCTION process_sync_queue(batch_size INTEGER DEFAULT 100)
RETURNS TABLE(
  processed INTEGER,
  succeeded INTEGER,
  failed INTEGER
) AS $$
DECLARE
  v_processed INTEGER := 0;
  v_succeeded INTEGER := 0;
  v_failed INTEGER := 0;
  queue_record RECORD;
BEGIN
  -- Buscar registros pendentes
  FOR queue_record IN
    SELECT id, ficha_id, operation, payload
    FROM sync_queue
    WHERE status = 'pending' AND retry_count < 3
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Marcar como processando
      UPDATE sync_queue
      SET status = 'processing'
      WHERE id = queue_record.id;

      -- Aqui a sincronização real seria feita via edge function
      -- Por enquanto, apenas marcar como completado
      -- A edge function tabulador-export fará o trabalho real
      
      UPDATE sync_queue
      SET 
        status = 'completed',
        processed_at = NOW()
      WHERE id = queue_record.id;

      v_processed := v_processed + 1;
      v_succeeded := v_succeeded + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Registrar erro
      UPDATE sync_queue
      SET 
        status = 'failed',
        retry_count = retry_count + 1,
        last_error = SQLERRM,
        processed_at = NOW()
      WHERE id = queue_record.id;

      v_processed := v_processed + 1;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_succeeded, v_failed;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar fila antiga (manter apenas últimos 7 dias)
CREATE OR REPLACE FUNCTION cleanup_sync_queue()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM sync_queue
  WHERE status = 'completed' 
    AND processed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies para sync_queue
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync queue"
  ON sync_queue
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage sync queue"
  ON sync_queue
  FOR ALL
  USING (true);

-- Comentários
COMMENT ON TABLE sync_queue IS 'Fila de sincronização para enviar alterações ao TabuladorMax';
COMMENT ON FUNCTION queue_ficha_for_sync() IS 'Trigger function que adiciona fichas modificadas à fila de sincronização';
COMMENT ON FUNCTION process_sync_queue(INTEGER) IS 'Processa lote de registros da fila de sincronização';
COMMENT ON FUNCTION cleanup_sync_queue() IS 'Remove registros antigos da fila de sincronização';
