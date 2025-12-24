-- Add onboarding_completed column to scouters table
ALTER TABLE public.scouters 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;