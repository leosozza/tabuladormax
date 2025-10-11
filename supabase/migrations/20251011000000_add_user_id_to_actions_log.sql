-- Add user_id column to actions_log to track who created each log entry
ALTER TABLE public.actions_log 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_actions_log_user_id ON public.actions_log(user_id);

-- Update existing logs to set user_id based on lead responsible (best effort)
-- This is optional and may not work for all cases
UPDATE public.actions_log 
SET user_id = (
  SELECT CAST(responsible AS UUID)
  FROM public.leads 
  WHERE leads.id = actions_log.lead_id 
    AND responsible IS NOT NULL
    AND responsible ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LIMIT 1
)
WHERE user_id IS NULL;
