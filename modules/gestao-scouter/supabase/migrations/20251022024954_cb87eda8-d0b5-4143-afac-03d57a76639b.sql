-- FASE 1: Corrigir Project ID incorreto no banco
-- O banco está com UUID em vez do Project ID real do TabuladorMax
UPDATE public.tabulador_config
SET project_id = 'gkvvtfqfggddzotxltxf'
WHERE project_id = 'fa1475f9-ea99-4684-a990-84bdf96f348a';

-- Adicionar constraint para garantir formato correto
ALTER TABLE public.tabulador_config
ADD CONSTRAINT tabulador_config_project_id_format 
CHECK (project_id ~ '^[a-z]{20}$');