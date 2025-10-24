-- Update enum for departments to include all requested options
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'analise';
ALTER TYPE public.app_department RENAME VALUE 'scouter' TO 'scouters';