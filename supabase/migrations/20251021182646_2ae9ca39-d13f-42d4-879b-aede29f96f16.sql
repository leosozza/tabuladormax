-- Add ignored_fields column to track automatically ignored fields during export
ALTER TABLE gestao_scouter_export_errors 
ADD COLUMN IF NOT EXISTS ignored_fields TEXT[];