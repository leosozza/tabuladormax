-- ============================================================================
-- Migration: Sync Health Monitoring
-- ============================================================================
-- Data: 2025-10-17
-- Descrição: Cria/atualiza tabelas e índices para monitoramento de sincronização
-- 
-- Tabelas:
-- - sync_logs: Auditoria de execuções de sincronização
-- - sync_status: Estado atual da sincronização (heartbeat)
-- - fichas: Garantir campos e índices necessários para sync
--
-- Índices:
-- - Otimizar queries de sincronização e monitoramento
-- - Garantir performance em operações de upsert
--
-- Triggers:
-- - Atualização automática de updated_at em fichas
-- ============================================================================

-- ============================================================================
-- 1. Tabela sync_logs (se não existir)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('gestao_to_tabulador', 'tabulador_to_gestao', 'bidirectional')),
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  errors JSONB,
  metadata JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.sync_logs IS 'Auditoria de execuções de sincronização entre TabuladorMax e Gestão Scouter';
COMMENT ON COLUMN public.sync_logs.sync_direction IS 'Direção da sincronização';
COMMENT ON COLUMN public.sync_logs.records_synced IS 'Quantidade de registros sincronizados com sucesso';
COMMENT ON COLUMN public.sync_logs.records_failed IS 'Quantidade de registros com falha';
COMMENT ON COLUMN public.sync_logs.errors IS 'Detalhes de erros ocorridos';
COMMENT ON COLUMN public.sync_logs.metadata IS 'Metadados adicionais (batch_id, source, etc)';
COMMENT ON COLUMN public.sync_logs.processing_time_ms IS 'Tempo de processamento em milissegundos';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_direction ON public.sync_logs(sync_direction);
CREATE INDEX IF NOT EXISTS idx_sync_logs_completed ON public.sync_logs(completed_at DESC) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- 2. Tabela sync_status (se não existir)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sync_status (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_sync_success BOOLEAN DEFAULT FALSE,
  total_records INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE public.sync_status IS 'Estado atual da sincronização e heartbeat de saúde';
COMMENT ON COLUMN public.sync_status.project_name IS 'Nome do projeto (gestao_scouter, tabulador_max, health_monitor)';
COMMENT ON COLUMN public.sync_status.last_sync_at IS 'Timestamp da última sincronização bem-sucedida';
COMMENT ON COLUMN public.sync_status.last_sync_success IS 'Indica se a última sincronização foi bem-sucedida';
COMMENT ON COLUMN public.sync_status.total_records IS 'Total de registros no último check';
COMMENT ON COLUMN public.sync_status.last_error IS 'Mensagem do último erro (null se sucesso)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_sync_status_updated ON public.sync_status(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status_project ON public.sync_status(project_name);

-- ============================================================================
-- 3. Campos e Índices em fichas
-- ============================================================================

-- Garantir que a tabela fichas existe (pode já existir de migração anterior)
-- Apenas adicionar campos que podem estar faltando

-- Campo id como primary key (se não for)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fichas_pkey' 
    AND conrelid = 'public.fichas'::regclass
  ) THEN
    -- Se não há PK, tentar criar (assumindo id existe)
    ALTER TABLE public.fichas ADD CONSTRAINT fichas_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Garantir campos de sincronização existem
ALTER TABLE public.fichas 
  ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'Gestao',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Comentários
COMMENT ON COLUMN public.fichas.sync_source IS 'Origem da última sincronização (Gestao, TabuladorMax, diagnostics)';
COMMENT ON COLUMN public.fichas.last_synced_at IS 'Timestamp da última sincronização bem-sucedida';
COMMENT ON COLUMN public.fichas.updated_at IS 'Timestamp de última modificação (atualizado automaticamente)';
COMMENT ON COLUMN public.fichas.deleted IS 'Soft delete flag';

-- Índices críticos para sincronização
CREATE UNIQUE INDEX IF NOT EXISTS fichas_pkey_unique ON public.fichas(id);
CREATE INDEX IF NOT EXISTS idx_fichas_updated_at ON public.fichas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fichas_last_synced ON public.fichas(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON public.fichas(sync_source);
CREATE INDEX IF NOT EXISTS idx_fichas_deleted ON public.fichas(deleted);

-- Índices adicionais para performance de queries comuns
CREATE INDEX IF NOT EXISTS idx_fichas_projeto ON public.fichas(projeto) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_fichas_scouter ON public.fichas(scouter) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_fichas_created_at ON public.fichas(created_at DESC) WHERE deleted = false;

-- ============================================================================
-- 4. Trigger de updated_at em fichas
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Atualiza automaticamente o campo updated_at em modificações';

-- Aplicar trigger em fichas
DROP TRIGGER IF EXISTS set_updated_at ON public.fichas;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER set_updated_at ON public.fichas IS 'Atualiza updated_at automaticamente em cada UPDATE';

-- ============================================================================
-- 5. Políticas RLS (opcional, mas recomendado)
-- ============================================================================

-- Habilitar RLS nas tabelas de sync (se já não estiver)
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Policy para service role ter acesso completo
CREATE POLICY IF NOT EXISTS "Service role full access to sync_logs"
  ON public.sync_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access to sync_status"
  ON public.sync_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy para leitura pública (opcional - ajustar conforme necessidade)
-- Descomente se quiser permitir leitura para usuários autenticados
-- CREATE POLICY IF NOT EXISTS "Authenticated users can read sync_status"
--   ON public.sync_status
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- ============================================================================
-- 6. Grants de permissões
-- ============================================================================

-- Garantir que service_role tem permissões completas
GRANT ALL ON public.sync_logs TO service_role;
GRANT ALL ON public.sync_status TO service_role;
GRANT ALL ON public.fichas TO service_role;

-- Garantir que função de trigger pode ser executada
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- ============================================================================
-- 7. Dados iniciais (opcional)
-- ============================================================================

-- Inserir registro inicial em sync_status para Gestão Scouter
INSERT INTO public.sync_status (id, project_name, last_sync_success, total_records, updated_at)
VALUES ('gestao_scouter', 'gestao_scouter', false, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Inserir registro inicial para TabuladorMax
INSERT INTO public.sync_status (id, project_name, last_sync_success, total_records, updated_at)
VALUES ('tabulador_max', 'tabulador_max', false, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. Verificações finais
-- ============================================================================

-- Verificar que tabelas foram criadas
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('sync_logs', 'sync_status', 'fichas');
  
  IF table_count < 3 THEN
    RAISE EXCEPTION 'Nem todas as tabelas necessárias foram criadas. Esperado: 3, Encontrado: %', table_count;
  END IF;
  
  RAISE NOTICE '✅ Migration concluída com sucesso! Tabelas: sync_logs, sync_status, fichas';
END $$;

-- Verificar índices em fichas
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'fichas'
    AND schemaname = 'public'
    AND indexname IN (
      'fichas_pkey_unique',
      'idx_fichas_updated_at',
      'idx_fichas_last_synced',
      'idx_fichas_sync_source'
    );
  
  RAISE NOTICE '✅ Índices criados em fichas: %', index_count;
END $$;

-- Verificar trigger
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at'
    AND tgrelid = 'public.fichas'::regclass
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger set_updated_at criado em fichas';
  ELSE
    RAISE WARNING '⚠️ Trigger set_updated_at não foi criado';
  END IF;
END $$;

-- ============================================================================
-- Fim da Migration
-- ============================================================================
