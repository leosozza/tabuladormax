-- ============================================================================
-- Migration: Ensure 'deleted' column exists in 'leads' table
-- ============================================================================
-- Date: 2025-10-18
-- Description: Ensures that the 'deleted' column exists in the 'leads' table
--              to support soft-delete functionality consistently across the app.
--
-- ⚠️ FONTE ÚNICA DE VERDADE: Tabela 'leads'
-- ==========================================
-- A tabela 'leads' é a FONTE ÚNICA de dados de leads na aplicação.
-- Esta migration garante que todas as operações de soft-delete funcionem
-- corretamente através da coluna 'deleted'.
--
-- Objetivo:
-- - Adicionar coluna 'deleted' se não existir
-- - Garantir valor padrão FALSE para novos registros
-- - Criar índice para otimizar queries que filtram registros não-deletados
-- - Garantir que registros existentes sejam marcados como não-deletados
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR COLUNA 'deleted' SE NÃO EXISTIR
-- ============================================================================

-- Adiciona coluna deleted com valor padrão FALSE
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Garantir que registros existentes sem valor sejam FALSE
UPDATE public.leads 
SET deleted = FALSE 
WHERE deleted IS NULL;

-- Tornar coluna NOT NULL após garantir que todos os valores existem
ALTER TABLE public.leads 
ALTER COLUMN deleted SET DEFAULT FALSE,
ALTER COLUMN deleted SET NOT NULL;

-- ============================================================================
-- 2. COMENTÁRIO PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON COLUMN public.leads.deleted IS 'Soft delete flag - TRUE indica registro deletado logicamente';

-- ============================================================================
-- 3. ÍNDICE PARA OTIMIZAÇÃO DE QUERIES
-- ============================================================================

-- Índice para otimizar queries que filtram registros não-deletados
-- A maioria das queries vai buscar apenas registros não-deletados (deleted = false ou deleted IS NULL)
CREATE INDEX IF NOT EXISTS idx_leads_not_deleted 
ON public.leads(id) 
WHERE deleted = FALSE OR deleted IS NULL;

-- Índice para otimizar queries que ordenam por data de criação e filtram deletados
CREATE INDEX IF NOT EXISTS idx_leads_criado_not_deleted 
ON public.leads(criado DESC) 
WHERE deleted = FALSE OR deleted IS NULL;

-- ============================================================================
-- 4. VERIFICAÇÃO DA MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
  column_not_null BOOLEAN;
  column_default TEXT;
  records_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Verificar se a coluna existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'deleted'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ Coluna "deleted" não foi criada na tabela "leads"';
  END IF;
  
  -- Verificar se a coluna é NOT NULL
  SELECT is_nullable = 'NO' INTO column_not_null
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'leads'
    AND column_name = 'deleted';
  
  IF NOT column_not_null THEN
    RAISE WARNING '⚠️ Coluna "deleted" deveria ser NOT NULL';
  END IF;
  
  -- Verificar valor padrão
  SELECT column_default INTO column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'leads'
    AND column_name = 'deleted';
    
  -- Contar registros
  SELECT COUNT(*) INTO records_count FROM public.leads;
  SELECT COUNT(*) INTO deleted_count FROM public.leads WHERE deleted = TRUE;
  
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '✅ Coluna "deleted" criada/verificada na tabela "leads"';
  RAISE NOTICE '✅ Valor padrão: %', COALESCE(column_default, 'FALSE');
  RAISE NOTICE 'ℹ️ Total de registros na tabela "leads": %', records_count;
  RAISE NOTICE 'ℹ️ Registros marcados como deletados: %', deleted_count;
  RAISE NOTICE 'ℹ️ Registros ativos: %', records_count - deleted_count;
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
-- Notas:
-- - Esta migration é idempotente (pode ser executada múltiplas vezes)
-- - Todos os registros existentes são marcados como não-deletados (deleted = FALSE)
-- - Índices foram criados com IF NOT EXISTS para evitar erros em re-execuções
-- - A coluna 'deleted' permite soft-delete, mantendo histórico de registros
-- ============================================================================
