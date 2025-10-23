-- =============================================
-- AJUSTES NA TABELA SYNC_STATUS
-- =============================================

-- Adicionar campos extras para melhor monitoramento
ALTER TABLE public.sync_status 
ADD COLUMN IF NOT EXISTS last_sync_success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;