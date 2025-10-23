-- ============================================================================
-- Migration: Sincronização Bidirecional TabuladorMax - Tabela Leads
-- ============================================================================
-- Data: 2025-10-18
-- Descrição: Infraestrutura completa para sincronização bidirecional entre
--            public.leads (Gestão Scouter) e public.leads (TabuladorMax)
--
-- Componentes:
-- 1. Extensão pgcrypto (para gen_random_uuid)
-- 2. Tabela public.leads (mirror do TabuladorMax)
-- 3. Tabela sync_queue (atualizada para suportar múltiplas tabelas)
-- 4. Tabela sync_logs_detailed (logs granulares)
-- 5. Tabela sync_status (atualizada com last_full_sync_at)
-- 6. Triggers em leads (updated_at + sync queue)
-- 7. Índices de performance
-- ============================================================================

-- ============================================================================
-- 1. EXTENSÕES
-- ============================================================================

-- Habilitar pgcrypto para gen_random_uuid (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. TABELA PUBLIC.LEADS
-- ============================================================================

-- Criar tabela leads espelhando estrutura do TabuladorMax
CREATE TABLE IF NOT EXISTS public.leads (
  -- Campos de identificação
  id TEXT PRIMARY KEY,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  idade TEXT,
  
  -- Campos de projeto e responsáveis
  projeto TEXT,
  scouter TEXT,
  supervisor TEXT,
  responsible TEXT,
  
  -- Campos de localização
  localizacao TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  local_da_abordagem TEXT,
  local_abordagem TEXT,
  address TEXT,
  
  -- Campos de datas
  criado TIMESTAMPTZ,
  data_criacao_ficha TIMESTAMPTZ,
  data_confirmacao_ficha TIMESTAMPTZ,
  data_agendamento DATE,
  data_criacao_agendamento TIMESTAMPTZ,
  data_retorno_ligacao TIMESTAMPTZ,
  horario_agendamento TEXT,
  
  -- Campos de valor e status
  valor_ficha NUMERIC,
  etapa TEXT,
  etapa_funil TEXT,
  etapa_fluxo TEXT,
  status_fluxo TEXT,
  status_tabulacao TEXT,
  
  -- Campos de confirmação
  ficha_confirmada TEXT,
  confirmado BOOLEAN DEFAULT false,
  presenca_confirmada BOOLEAN DEFAULT false,
  compareceu BOOLEAN DEFAULT false,
  agendado BOOLEAN DEFAULT false,
  
  -- Campos de mídia e arquivos
  foto TEXT,
  photo_url TEXT,
  cadastro_existe_foto BOOLEAN DEFAULT false,
  
  -- Campos de integração
  bitrix_telemarketing_id BIGINT,
  maxsystem_id_ficha TEXT,
  commercial_project_id UUID,
  responsible_user_id UUID,
  
  -- Campos de tabulação/modelo
  modelo TEXT,
  nome_modelo TEXT,
  tabulacao TEXT,
  gerenciamento_funil TEXT,
  funil_fichas TEXT,
  
  -- Campos de origem
  fonte TEXT,
  gestao_scouter TEXT,
  op_telemarketing TEXT,
  
  -- Campos de contatos adicionais
  celular TEXT,
  telefone_trabalho TEXT,
  telefone_casa TEXT,
  name TEXT,
  age INTEGER,
  
  -- Campos de metadados e sincronização
  raw JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false,
  sync_source TEXT DEFAULT 'Gestao',
  last_synced_at TIMESTAMPTZ,
  date_modify TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  
  -- Campos de auditoria
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários da tabela leads
COMMENT ON TABLE public.leads IS 'Tabela de leads espelhada com TabuladorMax para sincronização bidirecional';
COMMENT ON COLUMN public.leads.id IS 'Identificador único do lead (compatível entre sistemas)';
COMMENT ON COLUMN public.leads.sync_source IS 'Origem da última alteração (Gestao|TabuladorMax)';
COMMENT ON COLUMN public.leads.last_synced_at IS 'Timestamp da última sincronização bem-sucedida';
COMMENT ON COLUMN public.leads.updated_at IS 'Timestamp da última atualização (atualizado automaticamente)';
COMMENT ON COLUMN public.leads.deleted IS 'Soft delete flag';

-- ============================================================================
-- 3. ATUALIZAÇÃO DA TABELA SYNC_QUEUE
-- ============================================================================

-- A tabela sync_queue já existe, apenas garantir que tem todos os campos necessários
ALTER TABLE public.sync_queue 
  ADD COLUMN IF NOT EXISTS table_name TEXT DEFAULT 'fichas',
  ADD COLUMN IF NOT EXISTS row_id TEXT,
  ADD COLUMN IF NOT EXISTS operation TEXT CHECK (operation IN ('insert', 'update', 'delete'));

-- Atualizar constraint se existir
DO $$ 
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE public.sync_queue DROP CONSTRAINT IF EXISTS sync_queue_operation_check;
  
  -- Adicionar nova constraint
  ALTER TABLE public.sync_queue 
    ADD CONSTRAINT sync_queue_operation_check 
    CHECK (operation IN ('insert', 'update', 'delete'));
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignorar erro se constraint não puder ser alterada
END $$;

-- Adicionar índice para table_name se não existir
CREATE INDEX IF NOT EXISTS idx_sync_queue_table_name 
  ON public.sync_queue(table_name, created_at);

-- Comentários
COMMENT ON COLUMN public.sync_queue.table_name IS 'Nome da tabela de origem (leads, fichas, etc)';
COMMENT ON COLUMN public.sync_queue.row_id IS 'ID do registro afetado (texto para compatibilidade)';

-- ============================================================================
-- 4. TABELA SYNC_LOGS_DETAILED
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sync_logs_detailed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  table_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning', 'info')),
  records_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  response_data JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_detailed_created 
  ON public.sync_logs_detailed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_detailed_status 
  ON public.sync_logs_detailed(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_detailed_table 
  ON public.sync_logs_detailed(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_logs_detailed_endpoint 
  ON public.sync_logs_detailed(endpoint);

-- Comentários
COMMENT ON TABLE public.sync_logs_detailed IS 'Logs detalhados de operações de sincronização com informações granulares';
COMMENT ON COLUMN public.sync_logs_detailed.endpoint IS 'Nome da edge function ou endpoint que gerou o log';
COMMENT ON COLUMN public.sync_logs_detailed.table_name IS 'Tabela envolvida na operação';
COMMENT ON COLUMN public.sync_logs_detailed.response_data IS 'Dados de resposta da operação (JSON)';
COMMENT ON COLUMN public.sync_logs_detailed.metadata IS 'Metadados adicionais (batch_id, user_id, etc)';

-- ============================================================================
-- 5. ATUALIZAÇÃO DA TABELA SYNC_STATUS
-- ============================================================================

-- Adicionar campo last_full_sync_at se não existir
ALTER TABLE public.sync_status 
  ADD COLUMN IF NOT EXISTS last_full_sync_at TIMESTAMPTZ;

-- Comentário
COMMENT ON COLUMN public.sync_status.last_full_sync_at IS 'Timestamp da última sincronização completa (full sync)';

-- ============================================================================
-- 6. FUNÇÃO PARA ATUALIZAR UPDATED_AT AUTOMATICAMENTE
-- ============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGER PARA UPDATED_AT EM LEADS
-- ============================================================================

-- Trigger para atualizar updated_at automaticamente em leads
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. FUNÇÃO PARA ENFILEIRAR SINCRONIZAÇÃO DE LEADS
-- ============================================================================

-- Função que adiciona registros de leads à fila de sincronização
CREATE OR REPLACE FUNCTION enqueue_lead_for_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Evitar loops: não adicionar à fila se a alteração veio do TabuladorMax
  IF TG_OP != 'DELETE' THEN
    IF NEW.sync_source = 'TabuladorMax' AND 
       NEW.last_synced_at IS NOT NULL AND 
       (EXTRACT(EPOCH FROM (NOW() - NEW.last_synced_at)) * 1000) < 60000 THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Adicionar à fila de sincronização
  IF TG_OP = 'DELETE' THEN
    INSERT INTO sync_queue (table_name, row_id, operation, payload, sync_direction)
    VALUES (
      'leads',
      OLD.id,
      'delete',
      row_to_json(OLD),
      'gestao_to_tabulador'
    );
    RETURN OLD;
  ELSE
    INSERT INTO sync_queue (table_name, row_id, operation, payload, sync_direction)
    VALUES (
      'leads',
      NEW.id,
      TG_OP,
      row_to_json(NEW),
      'gestao_to_tabulador'
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. TRIGGER PARA ENFILEIRAR SINCRONIZAÇÃO EM LEADS
-- ============================================================================

-- Trigger para INSERT/UPDATE/DELETE em leads
DROP TRIGGER IF EXISTS trg_leads_enqueue_sync ON public.leads;
CREATE TRIGGER trg_leads_enqueue_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_lead_for_sync();

-- ============================================================================
-- 10. ÍNDICES DE PERFORMANCE PARA LEADS
-- ============================================================================

-- Índices para campos frequentemente consultados
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
  ON public.leads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sync_source 
  ON public.leads(sync_source);
CREATE INDEX IF NOT EXISTS idx_leads_last_synced_at 
  ON public.leads(last_synced_at) WHERE last_synced_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted 
  ON public.leads(deleted) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_leads_nome 
  ON public.leads(nome) WHERE nome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_telefone 
  ON public.leads(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_scouter 
  ON public.leads(scouter) WHERE scouter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_projeto 
  ON public.leads(projeto) WHERE projeto IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_etapa 
  ON public.leads(etapa) WHERE etapa IS NOT NULL;

-- Índices compostos para queries de sincronização
CREATE INDEX IF NOT EXISTS idx_leads_sync_query 
  ON public.leads(updated_at, sync_source, deleted);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Desabilitar RLS nas tabelas de sincronização para permitir service_role access
ALTER TABLE public.sync_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs_detailed DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status DISABLE ROW LEVEL SECURITY;

-- Habilitar RLS em leads e definir policies conforme necessário
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todos autenticados)
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
CREATE POLICY "Authenticated users can view leads"
  ON public.leads
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy para escrita (service role e admins)
DROP POLICY IF EXISTS "Service role can manage leads" ON public.leads;
CREATE POLICY "Service role can manage leads"
  ON public.leads
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 12. GRANTS PARA HTTP/FUNCTIONS
-- ============================================================================

-- Garantir que edge functions possam acessar as tabelas
GRANT ALL ON public.leads TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

GRANT ALL ON public.sync_queue TO postgres, service_role;
GRANT SELECT ON public.sync_queue TO authenticated;

GRANT ALL ON public.sync_logs_detailed TO postgres, service_role;
GRANT SELECT ON public.sync_logs_detailed TO authenticated;

GRANT ALL ON public.sync_status TO postgres, service_role;
GRANT SELECT ON public.sync_status TO authenticated;

-- ============================================================================
-- 13. SEED INICIAL SYNC_STATUS
-- ============================================================================

-- Inserir registro inicial para TabuladorMax em sync_status
INSERT INTO public.sync_status (id, project_name, last_sync_at, last_sync_success, total_records, last_full_sync_at, updated_at)
VALUES (
  'tabulador_max_leads',
  'TabuladorMax',
  NULL,
  false,
  0,
  NULL,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 14. FUNÇÃO DE LIMPEZA DA FILA (CLEANUP)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_sync_queue()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Remover registros completados com mais de 7 dias
  DELETE FROM sync_queue
  WHERE status = 'completed' 
    AND processed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_sync_queue() IS 'Remove registros antigos da fila de sincronização (7+ dias)';

-- ============================================================================
-- 15. FUNÇÃO DE VERIFICAÇÃO DE SAÚDE DA SINCRONIZAÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION check_sync_health()
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  pending_sync BIGINT,
  failed_sync BIGINT,
  last_sync TIMESTAMPTZ,
  health_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'leads'::TEXT as table_name,
    COUNT(*)::BIGINT as total_records,
    (SELECT COUNT(*) FROM sync_queue WHERE table_name = 'leads' AND status = 'pending')::BIGINT as pending_sync,
    (SELECT COUNT(*) FROM sync_queue WHERE table_name = 'leads' AND status = 'failed')::BIGINT as failed_sync,
    (SELECT last_sync_at FROM sync_status WHERE id = 'tabulador_max_leads')::TIMESTAMPTZ as last_sync,
    CASE 
      WHEN (SELECT COUNT(*) FROM sync_queue WHERE table_name = 'leads' AND status = 'failed') > 10 THEN 'critical'
      WHEN (SELECT COUNT(*) FROM sync_queue WHERE table_name = 'leads' AND status = 'pending') > 100 THEN 'warning'
      ELSE 'healthy'
    END as health_status
  FROM leads;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_sync_health() IS 'Verifica a saúde da sincronização e retorna métricas';

-- ============================================================================
-- 16. VERIFICAÇÃO DA MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_leads_count INTEGER;
  v_sync_queue_exists BOOLEAN;
  v_sync_logs_detailed_exists BOOLEAN;
  v_triggers_count INTEGER;
BEGIN
  -- Verificar tabela leads
  SELECT COUNT(*) INTO v_leads_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'leads';
  
  -- Verificar tabelas de sync
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sync_queue'
  ) INTO v_sync_queue_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sync_logs_detailed'
  ) INTO v_sync_logs_detailed_exists;
  
  -- Verificar triggers
  SELECT COUNT(*) INTO v_triggers_count
  FROM information_schema.triggers
  WHERE event_object_table = 'leads'
    AND trigger_name IN ('trg_leads_updated_at', 'trg_leads_enqueue_sync');
  
  -- Relatório
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICAÇÃO DA MIGRATION - Sync Leads TabuladorMax';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tabela leads: %', CASE WHEN v_leads_count > 0 THEN '✅ Criada' ELSE '❌ Não encontrada' END;
  RAISE NOTICE 'Tabela sync_queue: %', CASE WHEN v_sync_queue_exists THEN '✅ Disponível' ELSE '❌ Não encontrada' END;
  RAISE NOTICE 'Tabela sync_logs_detailed: %', CASE WHEN v_sync_logs_detailed_exists THEN '✅ Criada' ELSE '❌ Não encontrada' END;
  RAISE NOTICE 'Triggers em leads: % de 2', v_triggers_count;
  
  IF v_leads_count > 0 AND v_sync_queue_exists AND v_sync_logs_detailed_exists AND v_triggers_count = 2 THEN
    RAISE NOTICE '✅ Migration concluída com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Migration concluída com avisos. Verifique os logs acima.';
  END IF;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
