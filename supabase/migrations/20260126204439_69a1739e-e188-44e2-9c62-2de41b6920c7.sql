-- Add profile_id column to agent_operator_assignments
ALTER TABLE public.agent_operator_assignments
ADD COLUMN profile_id UUID REFERENCES public.profiles(id);

-- Create index for better lookup performance
CREATE INDEX idx_agent_operator_assignments_profile_id 
ON public.agent_operator_assignments(profile_id);

-- Make operator_bitrix_id nullable (was required before)
ALTER TABLE public.agent_operator_assignments
ALTER COLUMN operator_bitrix_id DROP NOT NULL;

-- Add constraint to ensure at least one identifier is present
ALTER TABLE public.agent_operator_assignments
ADD CONSTRAINT check_assignment_target 
CHECK (profile_id IS NOT NULL OR operator_bitrix_id IS NOT NULL);