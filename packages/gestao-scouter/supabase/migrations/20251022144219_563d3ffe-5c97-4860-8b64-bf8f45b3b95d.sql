-- Dropar função existente se houver
DROP FUNCTION IF EXISTS public.get_table_columns(text);

-- Criar função correta
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = get_table_columns.table_name
  ORDER BY c.ordinal_position;
END;
$$;

-- Recarregar schema cache
NOTIFY pgrst, 'reload schema';