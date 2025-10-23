-- =============================================
-- CORREÇÃO DE CAMPOS FALTANTES
-- =============================================

-- 1. Adicionar campos faltantes em scouter_profiles
ALTER TABLE public.scouter_profiles
ADD COLUMN IF NOT EXISTS nome TEXT,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Copiar name para nome e remover name se necessário
UPDATE public.scouter_profiles SET nome = name WHERE nome IS NULL;

-- 2. Adicionar campos faltantes em sync_logs_detailed
ALTER TABLE public.sync_logs_detailed
ADD COLUMN IF NOT EXISTS sync_direction TEXT,
ADD COLUMN IF NOT EXISTS errors JSONB,
ADD COLUMN IF NOT EXISTS records_synced INTEGER,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 3. Adicionar campos faltantes em sync_logs
ALTER TABLE public.sync_logs
ADD COLUMN IF NOT EXISTS sync_direction TEXT,
ADD COLUMN IF NOT EXISTS errors JSONB,
ADD COLUMN IF NOT EXISTS records_synced INTEGER,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;