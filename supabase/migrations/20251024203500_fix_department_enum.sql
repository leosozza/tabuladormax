-- ============================================
-- Fix Department ENUM to match UI expectations
-- ============================================

-- Add new values to the app_department enum
-- Note: PostgreSQL requires a specific approach to modify enums

-- Step 1: Add the missing 'analise' and 'scouters' values to the enum
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'analise';
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'scouters';

-- Step 2: Update any existing 'scouter' (singular) entries to 'scouters' (plural)
-- This ensures consistency with the UI expectations
UPDATE public.user_departments 
SET department = 'scouters'::app_department 
WHERE department = 'scouter'::app_department;

-- Note: We keep 'scouter' in the enum for backward compatibility
-- but migrate all data to use 'scouters' to match the UI
