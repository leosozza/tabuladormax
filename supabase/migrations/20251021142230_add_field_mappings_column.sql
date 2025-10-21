-- Add field_mappings column to gestao_scouter_export_jobs table
-- This supports the new field mapping feature where users can map
-- Tabuladormax fields to Gestao Scouter fields using drag-and-drop UI

ALTER TABLE public.gestao_scouter_export_jobs
ADD COLUMN IF NOT EXISTS field_mappings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.gestao_scouter_export_jobs.field_mappings IS 
'Mapeamento de campos entre Gestao Scouter e Tabuladormax. Formato: {"gestao_field": "tabuladormax_field"}. Se NULL, usa mapeamento padrão.';
