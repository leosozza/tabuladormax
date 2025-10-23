-- ============================================
-- UNIFICAÇÃO: Remover Sincronização Obsoleta
-- Sistema agora usa backend único compartilhado
-- ============================================

-- FASE 1: Remover Triggers de Sincronização entre Projetos
DROP TRIGGER IF EXISTS sync_lead_to_gestao_scouter_on_update ON public.leads;
DROP TRIGGER IF EXISTS tg_leads_to_sync_queue ON public.leads;

-- FASE 2: Remover Functions de Sincronização
DROP FUNCTION IF EXISTS public.trigger_sync_to_gestao_scouter() CASCADE;
DROP FUNCTION IF EXISTS public.queue_lead_for_sync() CASCADE;
DROP FUNCTION IF EXISTS public.sync_lead_to_fichas() CASCADE;
DROP FUNCTION IF EXISTS public.queue_ficha_for_sync() CASCADE;
DROP FUNCTION IF EXISTS public.process_sync_queue(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_sync_queue() CASCADE;

-- FASE 3: Remover Tabelas de Sincronização entre Projetos
DROP TABLE IF EXISTS public.sync_queue CASCADE;
DROP TABLE IF EXISTS public.sync_logs_detailed CASCADE;
DROP TABLE IF EXISTS public.gestao_scouter_config CASCADE;
DROP TABLE IF EXISTS public.gestao_scouter_export_jobs CASCADE;
DROP TABLE IF EXISTS public.gestao_scouter_export_errors CASCADE;
DROP TABLE IF EXISTS public.gestao_scouter_field_mappings CASCADE;

-- FASE 4: Remover Colunas de Sincronização da Tabela Leads
ALTER TABLE public.leads DROP COLUMN IF EXISTS sync_source;
ALTER TABLE public.leads DROP COLUMN IF EXISTS sync_status;
ALTER TABLE public.leads DROP COLUMN IF EXISTS last_synced_at;
ALTER TABLE public.leads DROP COLUMN IF EXISTS sync_error;

-- FASE 5: Atualizar Trigger do Bitrix (remover verificação de sync_source)
CREATE OR REPLACE FUNCTION public.trigger_sync_to_bitrix()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  lead_data jsonb;
  supabase_url text;
  service_key text;
BEGIN
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

  -- Construir payload
  lead_data := row_to_json(NEW);

  -- Chamar Edge Function do Bitrix assincronamente
  IF service_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := supabase_url || '/functions/v1/sync-to-bitrix',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object('lead', lead_data)
      );
  END IF;

  RETURN NEW;
END;
$function$;

-- FASE 6: Limpar Registros Obsoletos de sync_events
DELETE FROM public.sync_events 
WHERE direction IN ('gestao_to_tabulador', 'tabulador_to_gestao');

-- Log da migration
DO $$
BEGIN
  RAISE NOTICE '✅ Unificação concluída: sincronização obsoleta removida';
  RAISE NOTICE '✅ Triggers e functions de sync entre projetos deletados';
  RAISE NOTICE '✅ Tabelas obsoletas removidas (sync_queue, gestao_scouter_*, etc)';
  RAISE NOTICE '✅ Colunas de sync removidas da tabela leads';
  RAISE NOTICE '✅ Trigger do Bitrix atualizado';
  RAISE NOTICE '🎯 Sistema agora usa backend único compartilhado';
END $$;