-- ============================================================================
-- Migration: Fix fichas table 'id' field to auto-generate IDs
-- ============================================================================
-- Data: 2025-10-18
-- Descrição: Corrige o campo 'id' da tabela 'fichas' para gerar valores
--            automaticamente, resolvendo o erro de constraint NOT NULL 
--            quando inserindo novos leads sem fornecer 'id'.
--
-- Problema: O campo 'id' estava definido como 'text primary key' sem default,
--           causando erro ao tentar inserir registros sem fornecer o 'id'.
--
-- Solução: Manter TEXT (para compatibilidade com IDs numéricos da sincronização)
--          e adicionar DEFAULT gen_random_uuid()::text para gerar UUIDs como
--          strings para novos registros locais.
--
-- Cenários suportados:
-- 1. Criação local: Gera UUID string automaticamente (ex: "550e8400-e29b-41d4...")
-- 2. Sincronização TabuladorMax: Aceita IDs numéricos (ex: "558906")
-- 3. Importação: Aceita qualquer formato de ID texto
--
-- ============================================================================

-- Habilitar extensão UUID se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ETAPA 1: Adicionar DEFAULT à coluna id existente
-- ============================================================================

-- Adicionar DEFAULT que gera UUID como texto
ALTER TABLE public.fichas 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- ============================================================================
-- ETAPA 2: Adicionar comentário para documentação
-- ============================================================================

COMMENT ON COLUMN public.fichas.id IS 'Identificador único da ficha. Auto-gera UUID string para novos registros locais. Aceita IDs numéricos/texto de sincronização/importação.';

-- ============================================================================
-- ETAPA 3: Verificação da migração
-- ============================================================================

DO $$
DECLARE
  id_type TEXT;
  has_default BOOLEAN;
  default_value TEXT;
  is_not_null BOOLEAN;
BEGIN
  -- Verificar o tipo da coluna
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name = 'id';
  
  -- Verificar se tem default
  SELECT column_default IS NOT NULL INTO has_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name = 'id';
  
  -- Pegar o valor do default
  SELECT column_default INTO default_value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name = 'id';
  
  -- Verificar se é NOT NULL
  SELECT is_nullable = 'NO' INTO is_not_null
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name = 'id';
  
  IF id_type = 'text' AND has_default AND is_not_null THEN
    RAISE NOTICE '✅ Migration concluída com sucesso!';
    RAISE NOTICE '✅ Tipo da coluna id: %', id_type;
    RAISE NOTICE '✅ Default value: %', default_value;
    RAISE NOTICE '✅ NOT NULL constraint: Sim';
    RAISE NOTICE 'ℹ️ Novos registros locais: UUID string auto-gerado';
    RAISE NOTICE 'ℹ️ Sincronização/Importação: Aceita IDs numéricos/texto';
  ELSE
    RAISE WARNING '⚠️ Verificação falhou:';
    RAISE WARNING '   - Tipo: % (esperado: text)', id_type;
    RAISE WARNING '   - Default: % (esperado: true)', has_default;
    RAISE WARNING '   - NOT NULL: % (esperado: true)', is_not_null;
  END IF;
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
-- Notas:
-- - Esta migration mantém o campo 'id' como TEXT (compatível com IDs numéricos)
-- - Adiciona DEFAULT gen_random_uuid()::text para novos registros locais
-- - IDs existentes permanecem inalterados
-- - Sincronização do TabuladorMax (IDs numéricos como "558906") funcionará
-- - Importações com qualquer formato de ID funcionarão
-- - A aplicação não precisa fornecer 'id' ao criar registros locais
-- ============================================================================
