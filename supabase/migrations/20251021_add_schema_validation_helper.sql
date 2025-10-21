-- ============================================
-- Schema Validation Helper
-- Provides functions to validate schema compatibility
-- and help diagnose schema mismatch issues
-- ============================================

-- Function to get column information for the leads table
CREATE OR REPLACE FUNCTION public.get_leads_schema_info()
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text,
    column_default::text
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'leads'
  ORDER BY ordinal_position;
$$;

COMMENT ON FUNCTION public.get_leads_schema_info IS 
  'Returns schema information for the leads table to help diagnose schema mismatches';

-- Function to validate if all expected columns exist
CREATE OR REPLACE FUNCTION public.validate_leads_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  missing_columns text[];
  expected_columns text[] := ARRAY[
    'id', 'name', 'responsible', 'age', 'address', 'scouter', 'photo_url',
    'date_modify', 'raw', 'updated_at', 'created_at',
    'bitrix_telemarketing_id', 'commercial_project_id', 'responsible_user_id',
    'celular', 'telefone_trabalho', 'telefone_casa',
    'etapa', 'fonte', 'criado', 'nome_modelo', 'local_abordagem',
    'ficha_confirmada', 'data_criacao_ficha', 'data_confirmacao_ficha',
    'presenca_confirmada', 'compareceu', 'cadastro_existe_foto', 'valor_ficha',
    'data_criacao_agendamento', 'horario_agendamento', 'data_agendamento',
    'gerenciamento_funil', 'status_fluxo', 'etapa_funil', 'etapa_fluxo',
    'funil_fichas', 'status_tabulacao', 'maxsystem_id_ficha',
    'gestao_scouter', 'op_telemarketing', 'data_retorno_ligacao',
    'last_sync_at', 'sync_source', 'sync_status'
  ];
  col text;
  exists_check boolean;
BEGIN
  missing_columns := ARRAY[]::text[];
  
  -- Check each expected column
  FOREACH col IN ARRAY expected_columns
  LOOP
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'leads' 
        AND column_name = col
    ) INTO exists_check;
    
    IF NOT exists_check THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  -- Build result JSON
  result := jsonb_build_object(
    'valid', array_length(missing_columns, 1) IS NULL OR array_length(missing_columns, 1) = 0,
    'missing_columns', to_jsonb(missing_columns),
    'total_expected', array_length(expected_columns, 1),
    'total_missing', COALESCE(array_length(missing_columns, 1), 0),
    'checked_at', now()
  );
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.validate_leads_schema IS 
  'Validates that all expected columns exist in the leads table and returns a report';

-- Create a view for easy schema inspection
CREATE OR REPLACE VIEW public.v_leads_schema_summary AS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN (
      'id', 'name', 'responsible', 'age', 'address', 'scouter', 'photo_url',
      'date_modify', 'raw', 'updated_at', 'created_at',
      'bitrix_telemarketing_id', 'commercial_project_id', 'responsible_user_id',
      'celular', 'telefone_trabalho', 'telefone_casa',
      'etapa', 'fonte', 'criado', 'nome_modelo', 'local_abordagem',
      'ficha_confirmada', 'data_criacao_ficha', 'data_confirmacao_ficha',
      'presenca_confirmada', 'compareceu', 'cadastro_existe_foto', 'valor_ficha',
      'data_criacao_agendamento', 'horario_agendamento', 'data_agendamento',
      'gerenciamento_funil', 'status_fluxo', 'etapa_funil', 'etapa_fluxo',
      'funil_fichas', 'status_tabulacao', 'maxsystem_id_ficha',
      'gestao_scouter', 'op_telemarketing', 'data_retorno_ligacao',
      'last_sync_at', 'sync_source', 'sync_status'
    ) THEN 'Expected'
    ELSE 'Additional'
  END as column_status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'leads'
ORDER BY ordinal_position;

COMMENT ON VIEW public.v_leads_schema_summary IS 
  'Summary view of leads table schema with status indicating if columns are expected for sync';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_leads_schema_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_leads_schema() TO authenticated;
GRANT SELECT ON public.v_leads_schema_summary TO authenticated;
