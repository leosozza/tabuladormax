-- Adicionar coluna sync_target à tabela button_config
-- Permite escolher entre sincronização Bitrix → Supabase ou Supabase → Bitrix
ALTER TABLE button_config 
ADD COLUMN sync_target text DEFAULT 'bitrix' 
CHECK (sync_target IN ('bitrix', 'supabase'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN button_config.sync_target IS 'Define o fluxo de sincronização: bitrix (Bitrix → Supabase) ou supabase (Supabase → Bitrix)';
