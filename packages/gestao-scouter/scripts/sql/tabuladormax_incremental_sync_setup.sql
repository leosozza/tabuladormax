-- ============================================================================
-- TabuladorMax: Incremental Sync Setup
-- ============================================================================
-- Execute este SQL no banco de dados TabuladorMax para adicionar suporte
-- à sincronização incremental com Gestão Scouter.
--
-- IMPORTANTE: Este script deve ser executado no projeto TabuladorMax,
-- não no projeto Gestão Scouter.
-- ============================================================================

-- ============================================================================
-- 1. Adicionar coluna updated_at se não existir
-- ============================================================================
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.leads.updated_at IS 'Timestamp da última atualização do registro (atualizado automaticamente)';

-- ============================================================================
-- 2. Criar índice para performance em consultas de sincronização
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

COMMENT ON INDEX idx_leads_updated_at IS 'Índice para otimizar queries de sincronização incremental';

-- ============================================================================
-- 3. Criar função para atualizar updated_at automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Função trigger para atualizar updated_at automaticamente em cada UPDATE';

-- ============================================================================
-- 4. Criar trigger para atualizar updated_at em cada UPDATE
-- ============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER set_updated_at ON public.leads IS 'Trigger que atualiza updated_at automaticamente em cada UPDATE';

-- ============================================================================
-- 5. Popular updated_at nos registros existentes
-- ============================================================================
-- Preenche updated_at com fallback para outros campos de data disponíveis
UPDATE public.leads
SET updated_at = COALESCE(
  updated_at,
  modificado,
  criado,
  NOW()
)
WHERE updated_at IS NULL;

-- ============================================================================
-- 6. VERIFICAÇÃO - Execute para confirmar que tudo funcionou
-- ============================================================================
DO $$
DECLARE
  v_total_leads INTEGER;
  v_with_updated_at INTEGER;
  v_max_updated TIMESTAMPTZ;
  v_min_updated TIMESTAMPTZ;
  v_trigger_exists BOOLEAN;
  v_index_exists BOOLEAN;
BEGIN
  -- Contar registros
  SELECT COUNT(*) INTO v_total_leads FROM public.leads;
  SELECT COUNT(*) INTO v_with_updated_at FROM public.leads WHERE updated_at IS NOT NULL;
  SELECT MAX(updated_at) INTO v_max_updated FROM public.leads;
  SELECT MIN(updated_at) INTO v_min_updated FROM public.leads;
  
  -- Verificar trigger
  SELECT EXISTS(
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'leads'
      AND trigger_name = 'set_updated_at'
  ) INTO v_trigger_exists;
  
  -- Verificar índice
  SELECT EXISTS(
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'leads'
      AND indexname = 'idx_leads_updated_at'
  ) INTO v_index_exists;
  
  -- Relatório
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICAÇÃO: TabuladorMax Incremental Sync Setup';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total de leads: %', v_total_leads;
  RAISE NOTICE 'Leads com updated_at: %', v_with_updated_at;
  RAISE NOTICE 'Primeiro update: %', v_min_updated;
  RAISE NOTICE 'Último update: %', v_max_updated;
  RAISE NOTICE 'Trigger "set_updated_at": %', CASE WHEN v_trigger_exists THEN '✅ Criado' ELSE '❌ Não encontrado' END;
  RAISE NOTICE 'Índice "idx_leads_updated_at": %', CASE WHEN v_index_exists THEN '✅ Criado' ELSE '❌ Não encontrado' END;
  
  IF v_total_leads = v_with_updated_at AND v_trigger_exists AND v_index_exists THEN
    RAISE NOTICE '✅ Setup concluído com sucesso!';
  ELSIF v_total_leads != v_with_updated_at THEN
    RAISE WARNING '⚠️ Nem todos os registros têm updated_at preenchido';
  ELSIF NOT v_trigger_exists THEN
    RAISE WARNING '⚠️ Trigger não foi criado corretamente';
  ELSIF NOT v_index_exists THEN
    RAISE WARNING '⚠️ Índice não foi criado corretamente';
  END IF;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- QUERY DE TESTE - Registros recentemente atualizados
-- ============================================================================
-- Execute esta query para ver os registros mais recentemente atualizados:
--
-- SELECT id, nome, telefone, updated_at
-- FROM public.leads
-- ORDER BY updated_at DESC
-- LIMIT 10;
-- ============================================================================
