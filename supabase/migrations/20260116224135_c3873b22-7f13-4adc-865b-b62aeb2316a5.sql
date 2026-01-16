-- Corrigir RPC: usar tipo integer para bitrix_id (não bigint)
DROP FUNCTION IF EXISTS public.validate_scouter_access_key(text);

CREATE OR REPLACE FUNCTION public.validate_scouter_access_key(p_access_key text)
RETURNS TABLE(scouter_id text, scouter_name text, scouter_photo text, scouter_bitrix_id integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    AND (s.status IS NULL OR s.status = 'ativo');
END;
$$;