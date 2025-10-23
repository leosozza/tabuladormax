-- ============================================================================
-- Script de Verificação: Triggers de Sincronização no TabuladorMax
-- ============================================================================
-- Execute este script no SQL Editor do TabuladorMax (gkvvtfqfggddzotxltxf)
-- para verificar se os triggers de sincronização estão configurados corretamente.
--
-- ✅ = Configuração correta
-- ❌ = Configuração faltando ou incorreta
-- ============================================================================

DO $$
DECLARE
  v_http_extension_exists BOOLEAN;
  v_gestao_url TEXT;
  v_gestao_key TEXT;
  v_triggers_count INTEGER;
  v_function_exists BOOLEAN;
  v_result TEXT := '';
BEGIN
  -- ============================================================================
  -- 1. Verificar extensão HTTP
  -- ============================================================================
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'http'
  ) INTO v_http_extension_exists;
  
  IF v_http_extension_exists THEN
    v_result := v_result || '✅ Extensão HTTP habilitada' || E'\n';
  ELSE
    v_result := v_result || '❌ Extensão HTTP NÃO habilitada - Execute: CREATE EXTENSION IF NOT EXISTS http;' || E'\n';
  END IF;

  -- ============================================================================
  -- 2. Verificar variáveis de configuração
  -- ============================================================================
  BEGIN
    v_gestao_url := current_setting('app.gestao_scouter_url', true);
    v_gestao_key := current_setting('app.gestao_scouter_service_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_gestao_url := NULL;
    v_gestao_key := NULL;
  END;
  
  IF v_gestao_url IS NOT NULL AND v_gestao_url != '' THEN
    v_result := v_result || '✅ app.gestao_scouter_url configurada: ' || v_gestao_url || E'\n';
  ELSE
    v_result := v_result || '❌ app.gestao_scouter_url NÃO configurada' || E'\n';
    v_result := v_result || '   Execute: ALTER DATABASE postgres SET app.gestao_scouter_url = ''https://ngestyxtopvfeyenyvgt.supabase.co'';' || E'\n';
  END IF;
  
  IF v_gestao_key IS NOT NULL AND v_gestao_key != '' THEN
    v_result := v_result || '✅ app.gestao_scouter_service_key configurada (***' || substring(v_gestao_key from length(v_gestao_key) - 10) || ')' || E'\n';
  ELSE
    v_result := v_result || '❌ app.gestao_scouter_service_key NÃO configurada' || E'\n';
    v_result := v_result || '   Execute: ALTER DATABASE postgres SET app.gestao_scouter_service_key = ''<sua_service_key>'';' || E'\n';
  END IF;

  -- ============================================================================
  -- 3. Verificar função de sincronização
  -- ============================================================================
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_lead_to_fichas'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    v_result := v_result || '✅ Função sync_lead_to_fichas() existe' || E'\n';
  ELSE
    v_result := v_result || '❌ Função sync_lead_to_fichas() NÃO existe - Execute: trigger_sync_leads_to_fichas.sql' || E'\n';
  END IF;

  -- ============================================================================
  -- 4. Verificar triggers na tabela leads
  -- ============================================================================
  SELECT COUNT(*) INTO v_triggers_count
  FROM pg_trigger
  WHERE tgrelid = 'public.leads'::regclass
    AND tgname IN (
      'trigger_sync_lead_insert',
      'trigger_sync_lead_update',
      'trigger_sync_lead_delete'
    );
  
  IF v_triggers_count = 3 THEN
    v_result := v_result || '✅ Todos os 3 triggers de sincronização instalados' || E'\n';
  ELSIF v_triggers_count > 0 THEN
    v_result := v_result || '⚠️  Apenas ' || v_triggers_count || '/3 triggers instalados - Execute: trigger_sync_leads_to_fichas.sql' || E'\n';
  ELSE
    v_result := v_result || '❌ Nenhum trigger de sincronização instalado - Execute: trigger_sync_leads_to_fichas.sql' || E'\n';
  END IF;

  -- ============================================================================
  -- RESULTADO FINAL
  -- ============================================================================
  RAISE NOTICE E'\n============================================================================';
  RAISE NOTICE 'VERIFICAÇÃO DE TRIGGERS NO TABULADORMAX';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '%', v_result;
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Próximos passos se houver ❌:';
  RAISE NOTICE '1. Habilitar extensão HTTP: CREATE EXTENSION IF NOT EXISTS http;';
  RAISE NOTICE '2. Configurar variáveis de ambiente (ver acima)';
  RAISE NOTICE '3. Recarregar configurações: SELECT pg_reload_conf();';
  RAISE NOTICE '4. Executar trigger_sync_leads_to_fichas.sql';
  RAISE NOTICE '5. Ver guia completo: DEPLOYMENT_SYNC_BIDIRECTIONAL.md';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- Queries Adicionais de Verificação
-- ============================================================================

-- Listar todos os triggers na tabela leads
SELECT 
  'Triggers em leads' AS verificacao,
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    WHEN tgenabled = 'D' THEN '❌ Desabilitado'
    ELSE '⚠️ Status desconhecido'
  END as status,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.leads'::regclass
  AND tgname LIKE '%sync%'
ORDER BY tgname;

-- Verificar se a tabela leads existe e tem dados
SELECT 
  'Estatísticas da tabela leads' AS verificacao,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 day') as leads_ultimas_24h,
  COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as leads_ultima_hora,
  MIN(updated_at) as lead_mais_antigo,
  MAX(updated_at) as lead_mais_recente
FROM leads;

-- Verificar configurações do PostgreSQL
SELECT 
  'Configurações do PostgreSQL' AS verificacao,
  name,
  setting,
  CASE 
    WHEN name LIKE 'app.gestao_scouter%' AND setting IS NOT NULL THEN '✅'
    WHEN name LIKE 'app.gestao_scouter%' THEN '❌'
    ELSE '⚠️'
  END as status
FROM pg_settings
WHERE name LIKE 'app.gestao_scouter%'
ORDER BY name;

-- Testar requisição HTTP (apenas se extensão e variáveis estiverem configuradas)
-- ATENÇÃO: Comente esta seção se as configurações ainda não estiverem prontas
/*
DO $$
DECLARE
  v_response http_response;
  v_gestao_url TEXT;
  v_gestao_key TEXT;
BEGIN
  v_gestao_url := current_setting('app.gestao_scouter_url', true);
  v_gestao_key := current_setting('app.gestao_scouter_service_key', true);
  
  IF v_gestao_url IS NOT NULL AND v_gestao_key IS NOT NULL THEN
    -- Testar conexão com Gestão Scouter
    SELECT * INTO v_response FROM http((
      'GET',
      v_gestao_url || '/rest/v1/fichas?limit=1',
      ARRAY[
        http_header('apikey', v_gestao_key),
        http_header('Authorization', 'Bearer ' || v_gestao_key)
      ],
      NULL,
      NULL
    )::http_request);
    
    IF v_response.status >= 200 AND v_response.status < 300 THEN
      RAISE NOTICE '✅ Teste de conexão com Gestão Scouter: SUCESSO (Status: %)', v_response.status;
    ELSE
      RAISE WARNING '❌ Teste de conexão com Gestão Scouter: FALHOU (Status: %, Response: %)', 
        v_response.status, v_response.content;
    END IF;
  ELSE
    RAISE WARNING '⚠️ Não foi possível testar conexão: variáveis não configuradas';
  END IF;
END $$;
*/
