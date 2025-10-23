-- ============================================
-- MIGRATION: Sincronização Bidirecional LEADS
-- Data: 2025-10-22
-- ============================================

-- 1. Criar tabela sync_queue (genérica para leads)
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL DEFAULT 'leads',
  row_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  sync_direction TEXT NOT NULL DEFAULT 'gestao_to_tabulador',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  UNIQUE(table_name, row_id, operation)
);

-- 2. Criar função queue_lead_for_sync()
CREATE OR REPLACE FUNCTION queue_lead_for_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Proteção contra loop infinito
  IF (TG_OP = 'DELETE') THEN
    -- DELETE sempre enfileira
    INSERT INTO sync_queue (table_name, row_id, operation, payload, sync_direction)
    VALUES ('leads', OLD.id::TEXT, 'delete', row_to_json(OLD), 'gestao_to_tabulador')
    ON CONFLICT (table_name, row_id, operation) DO NOTHING;
    RETURN OLD;
  ELSE
    -- INSERT/UPDATE: não enfileira se veio do TabuladorMax recentemente
    IF (NEW.sync_source = 'TabuladorMax' AND 
        NEW.last_synced_at IS NOT NULL AND 
        NOW() - NEW.last_synced_at < INTERVAL '30 seconds') THEN
      RETURN NEW;
    END IF;
    
    INSERT INTO sync_queue (table_name, row_id, operation, payload, sync_direction)
    VALUES ('leads', NEW.id::TEXT, LOWER(TG_OP), row_to_json(NEW), 'gestao_to_tabulador')
    ON CONFLICT (table_name, row_id, operation) 
    DO UPDATE SET 
      payload = EXCLUDED.payload,
      created_at = NOW(),
      status = 'pending';
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger em leads
DROP TRIGGER IF EXISTS tg_leads_to_sync_queue ON public.leads;
CREATE TRIGGER tg_leads_to_sync_queue
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_lead_for_sync();

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created 
  ON sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table_row 
  ON sync_queue(table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_next_retry 
  ON sync_queue(next_retry_at) WHERE status = 'failed';

-- 5. RLS e Grants
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sync_queue"
  ON sync_queue FOR ALL
  USING (true);

CREATE POLICY "Authenticated can view sync_queue"
  ON sync_queue FOR SELECT
  USING (auth.uid() IS NOT NULL);

GRANT ALL ON sync_queue TO postgres, service_role;
GRANT SELECT ON sync_queue TO authenticated;

-- 6. Comentários para documentação
COMMENT ON TABLE sync_queue IS 'Fila de sincronização bidirecional entre Gestão Scouter e TabuladorMax';
COMMENT ON COLUMN sync_queue.sync_direction IS 'Direção: gestao_to_tabulador ou tabulador_to_gestao';
COMMENT ON COLUMN sync_queue.retry_count IS 'Número de tentativas de reprocessamento';
COMMENT ON FUNCTION queue_lead_for_sync() IS 'Enfileira mudanças em leads para sincronização com TabuladorMax (com proteção contra loop)';

-- 7. Log da migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251022_bidirectional_sync_leads concluída com sucesso';
  RAISE NOTICE '📊 Tabela sync_queue criada';
  RAISE NOTICE '⚙️ Função queue_lead_for_sync() criada';
  RAISE NOTICE '🔔 Trigger tg_leads_to_sync_queue ativo em leads';
  RAISE NOTICE '🔒 RLS habilitado em sync_queue';
END $$;