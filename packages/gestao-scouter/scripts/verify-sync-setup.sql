-- ============================================================================
-- Script de Verificação: Setup de Sincronização Bidirecional
-- ============================================================================
-- Execute este script no SQL Editor do Gestão Scouter (ngestyxtopvfeyenyvgt)
-- para verificar se todas as migrations e configurações estão aplicadas.
--
-- ✅ = Configuração correta
-- ❌ = Configuração faltando ou incorreta
-- ============================================================================

DO $$
DECLARE
  v_sync_queue_exists BOOLEAN;
  v_sync_metadata_exists BOOLEAN;
  v_sync_trigger_exists BOOLEAN;
  v_schema_columns_count INTEGER;
  v_expected_columns INTEGER := 36;
  v_sync_logs_exists BOOLEAN;
  v_sync_status_exists BOOLEAN;
  v_result TEXT := '';
BEGIN
  -- ============================================================================
  -- 1. Verificar tabela sync_queue
  -- ============================================================================
  SELECT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'sync_queue'
  ) INTO v_sync_queue_exists;
  
  IF v_sync_queue_exists THEN
    v_result := v_result || '✅ Tabela sync_queue existe' || E'\n';
  ELSE
    v_result := v_result || '❌ Tabela sync_queue NÃO existe - Execute: 20251017_sync_queue_trigger.sql' || E'\n';
  END IF;

  -- ============================================================================
  -- 2. Verificar campos de metadados de sincronização em fichas
  -- ============================================================================
  SELECT COUNT(*) INTO v_sync_metadata_exists
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'fichas'
    AND column_name IN ('sync_source', 'last_synced_at');
  
  IF v_sync_metadata_exists = 2 THEN
    v_result := v_result || '✅ Campos de metadados de sync em fichas (sync_source, last_synced_at)' || E'\n';
  ELSE
    v_result := v_result || '❌ Campos de metadados de sync FALTANDO - Execute: 20251017_add_sync_metadata.sql' || E'\n';
  END IF;

  -- ============================================================================
  -- 3. Verificar trigger de sincronização em fichas
  -- ============================================================================
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.fichas'::regclass
      AND tgname = 'fichas_sync_trigger'
  ) INTO v_sync_trigger_exists;
  
  IF v_sync_trigger_exists THEN
    v_result := v_result || '✅ Trigger fichas_sync_trigger existe' || E'\n';
  ELSE
    v_result := v_result || '❌ Trigger fichas_sync_trigger NÃO existe - Execute: 20251017_sync_queue_trigger.sql' || E'\n';
  END IF;

  -- ============================================================================
  -- 4. Verificar colunas adicionadas do schema sync (36 colunas)
  -- ============================================================================
  SELECT COUNT(*) INTO v_schema_columns_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name IN (
      -- Informações de contato
      'name', 'responsible', 'age', 'address', 'photo_url', 
      'celular', 'telefone_trabalho', 'telefone_casa',
      -- Integrações
      'bitrix_telemarketing_id', 'commercial_project_id', 'responsible_user_id',
      'fonte', 'nome_modelo', 'local_abordagem',
      -- Confirmação
      'ficha_confirmada', 'data_criacao_ficha', 'data_confirmacao_ficha', 
      'cadastro_existe_foto',
      -- Agendamento
      'presenca_confirmada', 'compareceu', 'data_criacao_agendamento',
      'horario_agendamento', 'data_agendamento', 'data_retorno_ligacao',
      -- Funil
      'gerenciamento_funil', 'status_fluxo', 'etapa_funil', 
      'etapa_fluxo', 'funil_fichas', 'status_tabulacao',
      -- Sistemas externos
      'maxsystem_id_ficha', 'gestao_scouter', 'op_telemarketing',
      -- Metadados
      'date_modify', 'last_sync_at', 'sync_status'
    );
  
  IF v_schema_columns_count = v_expected_columns THEN
    v_result := v_result || '✅ Schema completo de fichas (36/36 colunas adicionais)' || E'\n';
  ELSE
    v_result := v_result || '❌ Schema incompleto (' || v_schema_columns_count || '/' || v_expected_columns || ' colunas) - Execute: 20251018_sync_fichas_leads_schema.sql' || E'\n';
  END IF;

  -- ============================================================================
  -- 5. Verificar tabelas auxiliares
  -- ============================================================================
  SELECT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'sync_logs'
  ) INTO v_sync_logs_exists;
  
  IF v_sync_logs_exists THEN
    v_result := v_result || '✅ Tabela sync_logs existe' || E'\n';
  ELSE
    v_result := v_result || '⚠️  Tabela sync_logs NÃO existe (opcional)' || E'\n';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'sync_status'
  ) INTO v_sync_status_exists;
  
  IF v_sync_status_exists THEN
    v_result := v_result || '✅ Tabela sync_status existe' || E'\n';
  ELSE
    v_result := v_result || '⚠️  Tabela sync_status NÃO existe (opcional)' || E'\n';
  END IF;

  -- ============================================================================
  -- 6. Verificar funções de sincronização
  -- ============================================================================
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'queue_ficha_for_sync'
  ) THEN
    v_result := v_result || '✅ Função queue_ficha_for_sync() existe' || E'\n';
  ELSE
    v_result := v_result || '❌ Função queue_ficha_for_sync() NÃO existe - Execute: 20251017_sync_queue_trigger.sql' || E'\n';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'process_sync_queue'
  ) THEN
    v_result := v_result || '✅ Função process_sync_queue() existe' || E'\n';
  ELSE
    v_result := v_result || '❌ Função process_sync_queue() NÃO existe - Execute: 20251017_sync_queue_trigger.sql' || E'\n';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'cleanup_sync_queue'
  ) THEN
    v_result := v_result || '✅ Função cleanup_sync_queue() existe' || E'\n';
  ELSE
    v_result := v_result || '❌ Função cleanup_sync_queue() NÃO existe - Execute: 20251017_sync_queue_trigger.sql' || E'\n';
  END IF;

  -- ============================================================================
  -- 7. Verificar índices de sincronização
  -- ============================================================================
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename = 'fichas'
      AND indexname IN ('idx_fichas_last_synced', 'idx_fichas_sync_source')
  ) THEN
    v_result := v_result || '✅ Índices de sincronização em fichas' || E'\n';
  ELSE
    v_result := v_result || '⚠️  Índices de sincronização podem estar faltando' || E'\n';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename = 'sync_queue'
      AND indexname IN ('idx_sync_queue_status', 'idx_sync_queue_ficha')
  ) THEN
    v_result := v_result || '✅ Índices em sync_queue' || E'\n';
  ELSE
    v_result := v_result || '⚠️  Índices em sync_queue podem estar faltando' || E'\n';
  END IF;

  -- ============================================================================
  -- RESULTADO FINAL
  -- ============================================================================
  RAISE NOTICE E'\n============================================================================';
  RAISE NOTICE 'VERIFICAÇÃO DE SETUP DE SINCRONIZAÇÃO BIDIRECIONAL';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '%', v_result;
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Corrigir itens marcados com ❌';
  RAISE NOTICE '2. Configurar Secrets nas Edge Functions (Dashboard → Edge Functions → Secrets)';
  RAISE NOTICE '3. Deploy das Edge Functions (webhook-receiver, process-sync-queue, tabulador-export)';
  RAISE NOTICE '4. Configurar triggers no TabuladorMax (trigger_sync_leads_to_fichas.sql)';
  RAISE NOTICE '5. Configurar Cron Jobs ou Database Webhooks';
  RAISE NOTICE '6. Ver guia completo: DEPLOYMENT_SYNC_BIDIRECTIONAL.md';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- Queries Adicionais de Verificação
-- ============================================================================

-- Contar registros na fila de sincronização
SELECT 
  'Itens na fila de sincronização' AS verificacao,
  status,
  COUNT(*) as total
FROM sync_queue
GROUP BY status
ORDER BY status;

-- Últimas sincronizações
SELECT 
  'Últimas 5 sincronizações' AS verificacao,
  sync_direction,
  records_synced,
  records_failed,
  started_at,
  completed_at
FROM sync_logs
ORDER BY started_at DESC
LIMIT 5;

-- Estatísticas de fichas por fonte de sincronização
SELECT 
  'Distribuição por fonte de sync' AS verificacao,
  sync_source,
  COUNT(*) as total,
  MIN(last_synced_at) as oldest_sync,
  MAX(last_synced_at) as newest_sync
FROM fichas
WHERE deleted = false
GROUP BY sync_source
ORDER BY total DESC;

-- Triggers ativos em fichas
SELECT 
  'Triggers em fichas' AS verificacao,
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    WHEN tgenabled = 'D' THEN '❌ Desabilitado'
    ELSE '⚠️ Status desconhecido'
  END as status
FROM pg_trigger
WHERE tgrelid = 'public.fichas'::regclass
  AND tgname LIKE '%sync%'
ORDER BY tgname;
