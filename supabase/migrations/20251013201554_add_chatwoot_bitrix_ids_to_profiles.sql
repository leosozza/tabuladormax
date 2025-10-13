-- Add chatwoot_agent_id and bitrix_tele_id columns to profiles table
-- These columns will store the Chatwoot agent ID and Bitrix telemarketing ID for each user

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS chatwoot_agent_id TEXT,
ADD COLUMN IF NOT EXISTS bitrix_tele_id TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN public.profiles.chatwoot_agent_id IS 'ID do agente no Chatwoot';
COMMENT ON COLUMN public.profiles.bitrix_tele_id IS 'ID do telemarketing no Bitrix24';
