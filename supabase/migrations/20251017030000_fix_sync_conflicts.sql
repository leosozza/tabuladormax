-- ============================================
-- Correção de Conflitos e Sincronização
-- TabuladorMax ↔ Gestão Scouter
-- ============================================

-- 1. Garantir que as colunas de sincronização existem na tabela leads
DO $$ 
BEGIN
  -- Adicionar sync_source se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'sync_source'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN sync_source TEXT 
      CHECK (sync_source IN ('bitrix', 'supabase', 'gestao_scouter', 'csv'));
    RAISE NOTICE 'Coluna sync_source adicionada';
  END IF;

  -- Adicionar sync_status se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN sync_status TEXT 
      CHECK (sync_status IN ('synced', 'syncing', 'error', 'pending'));
    RAISE NOTICE 'Coluna sync_status adicionada';
  END IF;

  -- Adicionar last_sync_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN last_sync_at TIMESTAMPTZ;
    RAISE NOTICE 'Coluna last_sync_at adicionada';
  END IF;
END $$;

-- 2. Criar índices para campos de sincronização (se não existirem)
CREATE INDEX IF NOT EXISTS idx_leads_sync_source ON public.leads(sync_source);
CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON public.leads(sync_status);
CREATE INDEX IF NOT EXISTS idx_leads_last_sync_at ON public.leads(last_sync_at);

-- 3. Atualizar trigger_sync_to_bitrix para ignorar gestao_scouter
DROP FUNCTION IF EXISTS public.trigger_sync_to_bitrix() CASCADE;

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
  -- A verificação de sync_source é feita pela cláusula WHEN do trigger
  -- Este é um BEFORE trigger, então podemos modificar NEW se necessário
  -- Mas como a WHEN clause já filtra, não precisamos verificar novamente
  
  -- Obter URL e chave do Supabase
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_URL' LIMIT 1;

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- Usar valores padrão se não encontrar
  IF supabase_url IS NULL THEN
    supabase_url := 'https://jstsrgyxrrlklnzgsihd.supabase.co';
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

-- Recriar trigger com WHEN clause para melhor performance
DROP TRIGGER IF EXISTS sync_lead_to_bitrix_on_update ON public.leads;

CREATE TRIGGER sync_lead_to_bitrix_on_update
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  WHEN (
    -- Só dispara se sync_source não for um dos sistemas conhecidos
    -- Aceita ambos 'gestao_scouter' e 'gestao-scouter' para compatibilidade
    COALESCE(NEW.sync_source, '') NOT IN ('bitrix', 'supabase', 'gestao_scouter', 'gestao-scouter')
    AND COALESCE(OLD.sync_source, '') NOT IN ('bitrix', 'supabase', 'gestao_scouter', 'gestao-scouter')
  )
  EXECUTE FUNCTION public.trigger_sync_to_bitrix();

-- 4. Popular gestao_scouter_config com configuração padrão (se não existir)
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
)
SELECT 
  'https://CONFIGURE_GESTAO_SCOUTER_URL.supabase.co',
  'CONFIGURE_ANON_KEY',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.gestao_scouter_config WHERE active = true
);

-- 5. Adicionar comentários explicativos
COMMENT ON COLUMN public.leads.sync_source IS 'Origem da última sincronização: bitrix, supabase, gestao_scouter, csv. Nota: Aceita tanto gestao_scouter quanto gestao-scouter para compatibilidade com diferentes versões do sistema.';
COMMENT ON COLUMN public.leads.sync_status IS 'Status da última sincronização: synced, syncing, error, pending';
COMMENT ON COLUMN public.leads.last_sync_at IS 'Data/hora da última sincronização bem-sucedida';

-- NOTA IMPORTANTE: O sistema aceita tanto 'gestao_scouter' (com underscore) quanto 
-- 'gestao-scouter' (com hífen) para garantir compatibilidade. O padrão recomendado
-- é usar 'gestao_scouter' para consistência com os nomes de tabelas SQL.
