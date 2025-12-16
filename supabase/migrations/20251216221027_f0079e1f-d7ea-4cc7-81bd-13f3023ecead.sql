-- Dropar e recriar função validate_telemarketing_access_key com commercial_project_id
DROP FUNCTION IF EXISTS public.validate_telemarketing_access_key(text);

CREATE FUNCTION public.validate_telemarketing_access_key(p_access_key text)
RETURNS TABLE(
  operator_id uuid, 
  operator_name text, 
  operator_photo text, 
  bitrix_id integer, 
  cargo text,
  commercial_project_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as operator_id,
    t.name as operator_name,
    t.photo_url as operator_photo,
    t.bitrix_id::INTEGER,
    t.cargo::TEXT,
    t.commercial_project_id
  FROM telemarketing_operators t
  WHERE t.access_key = p_access_key
    AND t.status = 'ativo'
  LIMIT 1;
END;
$$;