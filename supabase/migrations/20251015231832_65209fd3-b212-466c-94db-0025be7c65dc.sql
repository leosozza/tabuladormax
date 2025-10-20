-- ============================================
-- FASE 2: Upload CSV via Storage (250MB+)
-- ============================================

-- 2.1. Criar bucket para CSVs de importação
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leads-csv-import', 
  'leads-csv-import', 
  false,
  5368709120, -- 5GB
  ARRAY['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Apenas admins/managers podem fazer upload
CREATE POLICY "Admins and managers can upload CSV"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'leads-csv-import' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can read CSV"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'leads-csv-import' AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- 2.2. Criar Tabela de Controle de Importações
CREATE TABLE IF NOT EXISTS csv_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, completed_with_errors, failed
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_csv_import_jobs_updated_at
  BEFORE UPDATE ON csv_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE csv_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import jobs"
  ON csv_import_jobs FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create import jobs"
  ON csv_import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own import jobs"
  ON csv_import_jobs FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Habilitar Realtime para monitorar progresso
ALTER PUBLICATION supabase_realtime ADD TABLE csv_import_jobs;

-- ============================================
-- FASE 4: Config para Sync Supabase → Bitrix
-- ============================================

-- Criar tabela de configuração
CREATE TABLE IF NOT EXISTS bitrix_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO bitrix_sync_config (webhook_url)
VALUES ('https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json')
ON CONFLICT DO NOTHING;

-- RLS: Apenas admins
ALTER TABLE bitrix_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync config"
  ON bitrix_sync_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 4: Habilitar Trigger Supabase → Bitrix
-- ============================================

-- Atualizar função do trigger para usar config dinâmica
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
    supabase_url := 'https://jstsrgyxrrlklnzgsihd.supabase.co';
  END IF;

  -- Atualizar status
  NEW.sync_status := 'syncing';

  -- Construir payload com TODOS os dados
  lead_data := jsonb_build_object(
    'id', NEW.id,
    'name', NEW.name,
    'age', NEW.age,
    'address', NEW.address,
    'photo_url', NEW.photo_url,
    'responsible', NEW.responsible,
    'scouter', NEW.scouter,
    'raw', NEW.raw,
    'bitrix_telemarketing_id', NEW.bitrix_telemarketing_id,
    'commercial_project_id', NEW.commercial_project_id,
    'responsible_user_id', NEW.responsible_user_id
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

-- Criar trigger (DROP IF EXISTS para evitar duplicatas)
DROP TRIGGER IF EXISTS sync_lead_to_bitrix_on_update ON leads;

CREATE TRIGGER sync_lead_to_bitrix_on_update
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.sync_source IS DISTINCT FROM 'bitrix')
  EXECUTE FUNCTION trigger_sync_to_bitrix();