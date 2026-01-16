-- Primeiro dropar a função existente para poder alterar o tipo de retorno
DROP FUNCTION IF EXISTS public.validate_scouter_access_key(text);

-- Recriar com o novo campo bitrix_id
CREATE OR REPLACE FUNCTION public.validate_scouter_access_key(p_access_key text)
RETURNS TABLE(scouter_id text, scouter_name text, scouter_photo text, scouter_bitrix_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id::text as scouter_id,
    s.name as scouter_name,
    s.photo_url as scouter_photo,
    s.bitrix_id as scouter_bitrix_id
  FROM scouters s
  WHERE s.access_key = p_access_key
    AND s.active = true;
END;
$$;