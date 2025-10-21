-- Criar função que retorna o schema da tabela leads
CREATE OR REPLACE FUNCTION public.get_leads_schema()
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    COALESCE(c.column_default, '')::text as column_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'leads'
  ORDER BY c.ordinal_position;
END;
$$;

-- Dar permissão para uso via service_role
GRANT EXECUTE ON FUNCTION public.get_leads_schema() TO service_role;

COMMENT ON FUNCTION public.get_leads_schema() IS 'Retorna o schema completo da tabela leads para sincronização com Gestão Scouter';