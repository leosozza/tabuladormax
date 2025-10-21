-- ============================================
-- CORREÇÃO COMPLETA: Schema Gestão Scouter
-- ============================================

-- 1️⃣ Padronizar tipo de fields_selected (remover JSONB, manter TEXT[])
-- Drop JSONB variant if exists
DO $$ 
BEGIN
  -- Convert existing JSONB data to TEXT[] before altering
  UPDATE public.gestao_scouter_export_jobs
  SET fields_selected = (
    SELECT ARRAY(SELECT jsonb_array_elements_text(fields_selected))
    WHERE jsonb_typeof(fields_selected) = 'array'
  )
  WHERE fields_selected IS NOT NULL 
    AND pg_typeof(fields_selected::text::jsonb) = 'jsonb'::regtype;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if conversion fails
END $$;

-- Ensure fields_selected is TEXT[]
ALTER TABLE public.gestao_scouter_export_jobs 
ALTER COLUMN fields_selected TYPE TEXT[] 
USING CASE 
  WHEN fields_selected IS NULL THEN NULL
  ELSE fields_selected::TEXT[]
END;

-- 2️⃣ Garantir que field_mappings existe como JSONB
ALTER TABLE public.gestao_scouter_export_jobs
ADD COLUMN IF NOT EXISTS field_mappings JSONB DEFAULT NULL;

COMMENT ON COLUMN public.gestao_scouter_export_jobs.fields_selected IS 
'Array de nomes de campos selecionados para exportação. NULL = todos os campos. (LEGACY - use field_mappings)';

COMMENT ON COLUMN public.gestao_scouter_export_jobs.field_mappings IS 
'Mapeamento de campos entre Gestao Scouter e Tabuladormax. Formato: {"gestao_field": "tabuladormax_field"}. Se NULL, usa mapeamento padrão.';

-- 3️⃣ Criar função RPC para buscar schema (substitui information_schema.columns)
CREATE OR REPLACE FUNCTION public.get_leads_table_columns()
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'leads'
  ORDER BY c.ordinal_position;
END;
$$;

COMMENT ON FUNCTION public.get_leads_table_columns() IS 
'Retorna schema da tabela leads para validação de sincronização com Gestão Scouter';

-- 4️⃣ Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_status 
ON public.gestao_scouter_export_jobs(status);

CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_created_by 
ON public.gestao_scouter_export_jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_errors_job_id 
ON public.gestao_scouter_export_errors(job_id);

-- 5️⃣ Forçar reload do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';