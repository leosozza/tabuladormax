-- Remover função antiga do trigger
DROP FUNCTION IF EXISTS public.trigger_sync_to_bitrix() CASCADE;

-- Recriar função corrigida (APENAS com campos que existem na tabela leads)
CREATE OR REPLACE FUNCTION public.trigger_sync_to_bitrix()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  lead_data jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Evitar loop infinito
  IF NEW.sync_source = 'bitrix' THEN
    RAISE NOTICE 'Ignorando trigger - origem é bitrix';
    NEW.sync_source := NULL;
    RETURN NEW;
  END IF;

  -- Obter URL e chave do Supabase
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_URL' LIMIT 1;

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- Usar valores padrão se não encontrar
  IF supabase_url IS NULL THEN
    supabase_url := 'https://gkvvtfqfggddzotxltxf.supabase.co';
  END IF;

  -- Atualizar status
  NEW.sync_status := 'syncing';

  -- Construir payload APENAS com campos existentes na tabela leads
  lead_data := jsonb_build_object(
    'id', NEW.id,
    'name', NEW.name,
    'age', NEW.age,
    'address', NEW.address,
    'photo_url', NEW.photo_url,
    'responsible', NEW.responsible,
    'scouter', NEW.scouter,
    'raw', NEW.raw
  );

  -- Chamar Edge Function assincronamente
  IF service_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := supabase_url || '/functions/v1/sync-to-bitrix',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'lead', lead_data,
          'source', 'supabase'
        )
      );
  END IF;

  RETURN NEW;
END;
$function$;

-- Recriar trigger
DROP TRIGGER IF EXISTS sync_lead_to_bitrix_on_update ON public.leads;

CREATE TRIGGER sync_lead_to_bitrix_on_update
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_to_bitrix();

-- Resetar job de importação para permitir reinício
UPDATE bitrix_import_jobs
SET 
  status = 'pending',
  processing_date = start_date,
  imported_leads = 0,
  error_leads = 0,
  total_leads = 0,
  started_at = NULL,
  paused_at = NULL,
  error_details = NULL,
  updated_at = NOW()
WHERE status IN ('running', 'paused', 'error')
  AND start_date = '2024-10-15';