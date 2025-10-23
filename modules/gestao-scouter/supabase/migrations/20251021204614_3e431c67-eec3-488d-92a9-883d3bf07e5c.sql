-- Copiar commercial_project_id para projeto onde projeto está NULL
UPDATE leads 
SET projeto = commercial_project_id 
WHERE projeto IS NULL AND commercial_project_id IS NOT NULL;