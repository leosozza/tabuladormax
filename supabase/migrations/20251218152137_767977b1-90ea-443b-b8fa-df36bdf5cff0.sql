-- Criar função RPC para buscar comparecidos por data
CREATE OR REPLACE FUNCTION public.get_comparecidos_by_date(
  p_start_date TEXT,
  p_end_date TEXT,
  p_operator_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  nome_modelo TEXT,
  scouter TEXT,
  telemarketing TEXT,
  bitrix_telemarketing_id INTEGER,
  fonte_normalizada TEXT,
  data_compareceu TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.nome_modelo,
    l.scouter,
    l.telemarketing,
    l.bitrix_telemarketing_id,
    l.fonte_normalizada,
    l.raw->>'UF_CRM_DATACOMPARECEU' as data_compareceu
  FROM leads l
  WHERE l.raw->>'UF_CRM_DATACOMPARECEU' IS NOT NULL
    AND l.raw->>'UF_CRM_DATACOMPARECEU' != ''
    AND l.raw->>'UF_CRM_DATACOMPARECEU' >= p_start_date
    AND l.raw->>'UF_CRM_DATACOMPARECEU' < (p_end_date || 'T23:59:59')
    AND (p_operator_id IS NULL OR l.bitrix_telemarketing_id = p_operator_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_comparecidos_by_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comparecidos_by_date TO anon;