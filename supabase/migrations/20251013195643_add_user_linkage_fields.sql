-- Add linkage fields to profiles table for Chatwoot agents and Bitrix operators
-- This allows admins to link Tabulador users with Chatwoot agents and Bitrix telemarketing operators

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS chatwoot_agent_id INTEGER,
ADD COLUMN IF NOT EXISTS bitrix_operator_id TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_chatwoot_agent_id ON public.profiles(chatwoot_agent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_bitrix_operator_id ON public.profiles(bitrix_operator_id);

-- Add comment to document the new fields
COMMENT ON COLUMN public.profiles.chatwoot_agent_id IS 'ID of the linked Chatwoot (Whatswoot) agent';
COMMENT ON COLUMN public.profiles.bitrix_operator_id IS 'ID of the linked Bitrix telemarketing operator (from crm.item.list entityTypeId=1144)';
