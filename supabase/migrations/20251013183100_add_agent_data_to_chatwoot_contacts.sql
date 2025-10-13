-- Add agent_data column to chatwoot_contacts table to store assignee information
-- This allows the currentAgent fields (id, name, email) to be properly mapped and retrieved

ALTER TABLE public.chatwoot_contacts 
ADD COLUMN IF NOT EXISTS agent_data JSONB DEFAULT '{}'::jsonb;

-- Add index on agent_data for faster queries
CREATE INDEX IF NOT EXISTS idx_chatwoot_contacts_agent_data ON public.chatwoot_contacts USING gin(agent_data);

-- Add comment to explain the column
COMMENT ON COLUMN public.chatwoot_contacts.agent_data IS 'Stores the current agent/assignee data including id, name, email, and role';
