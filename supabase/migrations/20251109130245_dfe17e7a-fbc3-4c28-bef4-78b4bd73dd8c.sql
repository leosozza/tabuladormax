-- FASE 2: Corrigir função get_leads_schema() para retornar TODAS as colunas
CREATE OR REPLACE FUNCTION public.get_leads_schema()
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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