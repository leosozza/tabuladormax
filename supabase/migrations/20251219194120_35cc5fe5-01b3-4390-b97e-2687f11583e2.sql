-- Criar função RPC para heartbeat do telemarketing (bypassa RLS)
CREATE OR REPLACE FUNCTION public.telemarketing_heartbeat(p_bitrix_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE telemarketing_operators
  SET last_activity_at = NOW(), status = 'ativo'
  WHERE bitrix_id = p_bitrix_id;
END;
$$;

-- Permitir que qualquer pessoa execute a função
GRANT EXECUTE ON FUNCTION public.telemarketing_heartbeat(integer) TO anon, authenticated;