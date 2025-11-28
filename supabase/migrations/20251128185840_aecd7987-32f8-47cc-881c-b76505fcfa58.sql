-- 1. Modificar função throttled_refresh_timesheet para SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.throttled_refresh_timesheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  last_refresh TIMESTAMP;
BEGIN
  -- Buscar última atualização
  SELECT value::TEXT::TIMESTAMP INTO last_refresh
  FROM config_kv
  WHERE key = 'timesheet_last_refresh';
  
  -- Refresh apenas se passou mais de 1 minuto
  IF last_refresh IS NULL OR (NOW() - last_refresh) > INTERVAL '1 minute' THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY scouter_daily_timesheet;
    
    INSERT INTO config_kv (key, value)
    VALUES ('timesheet_last_refresh', to_jsonb(NOW()::TEXT))
    ON CONFLICT (key) DO UPDATE SET value = to_jsonb(NOW()::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Criar política RLS para INSERT público (pré-cadastro)
CREATE POLICY "Allow anon insert leads for precadastro" 
ON public.leads
FOR INSERT 
TO anon
WITH CHECK (true);

-- 3. Criar política RLS para UPDATE público (quando tem leadId na URL)
CREATE POLICY "Allow anon update leads for precadastro" 
ON public.leads
FOR UPDATE 
TO anon
USING (true)
WITH CHECK (true);

-- 4. Adicionar coluna additional_photos para armazenar múltiplas fotos
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS additional_photos jsonb DEFAULT '[]'::jsonb;