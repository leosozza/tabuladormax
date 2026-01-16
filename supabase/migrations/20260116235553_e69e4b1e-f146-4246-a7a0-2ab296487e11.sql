-- Dropar e recriar a função validate_scouter_access_key para incluir o tier
DROP FUNCTION IF EXISTS public.validate_scouter_access_key(text);

CREATE FUNCTION public.validate_scouter_access_key(p_access_key text)
RETURNS TABLE(
  scouter_id uuid,
  scouter_name text,
  scouter_photo text,
  scouter_bitrix_id integer,
  scouter_tier text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as scouter_id,
    name as scouter_name,
    photo_url as scouter_photo,
    bitrix_id as scouter_bitrix_id,
    tier as scouter_tier
  FROM scouters
  WHERE access_key = p_access_key
    AND status = 'ativo'
  LIMIT 1;
$$;