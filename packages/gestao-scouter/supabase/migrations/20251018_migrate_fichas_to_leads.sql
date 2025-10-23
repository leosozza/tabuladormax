-- ============================================================================
-- Migration: Migrate from 'fichas' to 'leads' as Single Source of Truth
-- ============================================================================
-- Date: 2025-10-18
-- Description: Creates the 'leads' table with complete schema, migrates data
--              from 'fichas', and establishes 'leads' as the single source of
--              truth for all lead/ficha data in the application.
--
-- Objectives:
-- 1. Create public.leads table with complete 36+ column schema
-- 2. Migrate all data from public.fichas to public.leads
-- 3. Set up RLS policies, triggers, and indexes for public.leads
-- 4. Create compatibility view for rollback support
-- 5. Drop public.fichas table after validation
--
-- ⚠️ ATTENTION: This migration changes the single source of truth from
--    'fichas' to 'leads'. All application code must be updated accordingly.
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE LEADS TABLE WITH FULL SCHEMA
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the leads table with comprehensive schema
CREATE TABLE IF NOT EXISTS public.leads (
  -- Primary identifier - Auto-generates UUID for local records, accepts text IDs from sync
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Core fields (original fichas schema)
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  scouter TEXT,
  projeto TEXT,
  criado DATE,
  valor_ficha NUMERIC(12,2),
  deleted BOOLEAN DEFAULT false,
  
  -- Contact information and identification
  nome TEXT,                                  -- Lead's full name
  name TEXT,                                  -- Alternative name field
  responsible TEXT,                           -- Person responsible for the lead
  age INTEGER,                                -- Lead's age
  idade INTEGER,                              -- Alternative age field
  address TEXT,                               -- Complete address
  photo_url TEXT,                             -- Lead photo URL
  foto TEXT,                                  -- Alternative photo field
  
  -- Contact phones
  telefone TEXT,                              -- Primary phone
  celular TEXT,                               -- Mobile phone
  telefone_trabalho TEXT,                     -- Work phone
  telefone_casa TEXT,                         -- Home phone
  
  -- Contact email
  email TEXT,
  
  -- Geolocation
  latitude NUMERIC(10,8),                     -- Latitude coordinate
  longitude NUMERIC(11,8),                    -- Longitude coordinate
  localizacao TEXT,                           -- Location description
  
  -- Bitrix and external integrations
  bitrix_telemarketing_id BIGINT,             -- Bitrix telemarketing ID
  commercial_project_id UUID,                 -- Commercial project reference
  responsible_user_id UUID,                   -- Responsible user reference
  fonte TEXT,                                 -- Lead source
  
  -- Lead details
  modelo TEXT,                                -- Model name
  nome_modelo TEXT,                           -- Alternative model name field
  local_abordagem TEXT,                       -- Approach location
  local_da_abordagem TEXT,                    -- Alternative approach location field
  
  -- Confirmation and validation
  ficha_confirmada BOOLEAN DEFAULT false,     -- Whether ficha is confirmed
  data_criacao_ficha TIMESTAMPTZ,             -- Ficha creation date
  data_confirmacao_ficha TIMESTAMPTZ,         -- Ficha confirmation date
  cadastro_existe_foto BOOLEAN DEFAULT false, -- Whether photo exists in registration
  
  -- Presence and attendance
  presenca_confirmada BOOLEAN DEFAULT false,  -- Presence confirmed
  compareceu BOOLEAN DEFAULT false,           -- Actually attended
  confirmado TEXT,                            -- Confirmation text field
  
  -- Scheduling
  agendado TEXT,                              -- Scheduled indicator
  data_criacao_agendamento TIMESTAMPTZ,       -- Scheduling creation date
  horario_agendamento TEXT,                   -- Scheduling time
  data_agendamento DATE,                      -- Scheduling date
  hora_criacao_ficha TIME,                    -- Ficha creation time
  data_retorno_ligacao TIMESTAMPTZ,           -- Call return date
  
  -- Stage and funnel management
  etapa TEXT,                                 -- Current stage
  gerenciamento_funil TEXT,                   -- Funnel management
  status_fluxo TEXT,                          -- Flow status
  etapa_funil TEXT,                           -- Funnel stage
  etapa_fluxo TEXT,                           -- Flow stage
  funil_fichas TEXT,                          -- Fichas funnel
  status_tabulacao TEXT,                      -- Tabulation status
  tabulacao TEXT,                             -- Tabulation field
  
  -- Approval and supervisor
  aprovado BOOLEAN,                           -- Approval status
  supervisor TEXT,                            -- Supervisor name
  supervisor_do_scouter TEXT,                 -- Alternative supervisor field
  
  -- External system integration
  maxsystem_id_ficha TEXT,                    -- MaxSystem ficha ID
  gestao_scouter TEXT,                        -- Gestão Scouter identifier
  op_telemarketing TEXT,                      -- Telemarketing operator
  
  -- Sync and audit metadata
  date_modify TIMESTAMPTZ,                    -- Last modification date
  last_sync_at TIMESTAMPTZ,                   -- Last sync timestamp (TabuladorMax)
  last_synced_at TIMESTAMPTZ,                 -- Last sync timestamp (Gestão Scouter)
  sync_status TEXT,                           -- Sync status (pending, synced, error)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),       -- Record creation timestamp
  updated_at TIMESTAMPTZ DEFAULT now()        -- Last update timestamp
);

-- ============================================================================
-- PHASE 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core fields indexes
CREATE INDEX IF NOT EXISTS idx_leads_criado ON public.leads(criado) WHERE criado IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_scouter ON public.leads(scouter) WHERE scouter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_projeto ON public.leads(projeto) WHERE projeto IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted ON public.leads(deleted) WHERE deleted = false;

-- Identification and search indexes
CREATE INDEX IF NOT EXISTS idx_leads_nome ON public.leads(nome) WHERE nome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_name ON public.leads(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_celular ON public.leads(celular) WHERE celular IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON public.leads(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_responsible ON public.leads(responsible) WHERE responsible IS NOT NULL;

-- Geolocation indexes
CREATE INDEX IF NOT EXISTS idx_leads_latitude ON public.leads(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_longitude ON public.leads(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_lat_lng ON public.leads(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- External integration indexes
CREATE INDEX IF NOT EXISTS idx_leads_bitrix_telemarketing_id ON public.leads(bitrix_telemarketing_id) WHERE bitrix_telemarketing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_commercial_project_id ON public.leads(commercial_project_id) WHERE commercial_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_maxsystem_id ON public.leads(maxsystem_id_ficha) WHERE maxsystem_id_ficha IS NOT NULL;

-- Status and funnel indexes
CREATE INDEX IF NOT EXISTS idx_leads_etapa ON public.leads(etapa) WHERE etapa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status_fluxo ON public.leads(status_fluxo) WHERE status_fluxo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_etapa_funil ON public.leads(etapa_funil) WHERE etapa_funil IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_ficha_confirmada ON public.leads(ficha_confirmada) WHERE ficha_confirmada = true;
CREATE INDEX IF NOT EXISTS idx_leads_aprovado ON public.leads(aprovado) WHERE aprovado IS NOT NULL;

-- Scheduling indexes
CREATE INDEX IF NOT EXISTS idx_leads_data_agendamento ON public.leads(data_agendamento) WHERE data_agendamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_presenca_confirmada ON public.leads(presenca_confirmada) WHERE presenca_confirmada = true;
CREATE INDEX IF NOT EXISTS idx_leads_compareceu ON public.leads(compareceu) WHERE compareceu = true;

-- Sync indexes
CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON public.leads(sync_status) WHERE sync_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_last_sync_at ON public.leads(last_sync_at) WHERE last_sync_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_last_synced_at ON public.leads(last_synced_at) WHERE last_synced_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_date_modify ON public.leads(date_modify DESC) WHERE date_modify IS NOT NULL;

-- Timestamp indexes
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON public.leads(updated_at DESC);

-- ============================================================================
-- PHASE 3: CREATE TRIGGERS
-- ============================================================================

-- Function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS tg_leads_updated ON public.leads;
CREATE TRIGGER tg_leads_updated 
BEFORE UPDATE ON public.leads
FOR EACH ROW 
EXECUTE FUNCTION public.tg_set_updated_at();

-- Function to add records to sync queue on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.tg_leads_sync_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if sync_queue table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sync_queue') THEN
    INSERT INTO public.sync_queue (table_name, record_id, operation, created_at)
    VALUES ('leads', NEW.id, TG_OP, now())
    ON CONFLICT (table_name, record_id) 
    DO UPDATE SET operation = EXCLUDED.operation, created_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to queue changes for sync
DROP TRIGGER IF EXISTS tg_leads_sync_queue ON public.leads;
CREATE TRIGGER tg_leads_sync_queue
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.tg_leads_sync_queue();

-- ============================================================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (adjust as needed for your security requirements)
DROP POLICY IF EXISTS leads_read_all ON public.leads;
CREATE POLICY leads_read_all ON public.leads 
FOR SELECT 
USING (true);

-- Policy for authenticated insert
DROP POLICY IF EXISTS leads_insert_authenticated ON public.leads;
CREATE POLICY leads_insert_authenticated ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for authenticated update
DROP POLICY IF EXISTS leads_update_authenticated ON public.leads;
CREATE POLICY leads_update_authenticated ON public.leads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for authenticated delete (soft delete by setting deleted = true)
DROP POLICY IF EXISTS leads_delete_authenticated ON public.leads;
CREATE POLICY leads_delete_authenticated ON public.leads
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- PHASE 5: ADD COLUMN COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.leads IS 'Single source of truth for all leads/fichas in the application. Replaces the fichas table.';

COMMENT ON COLUMN public.leads.id IS 'Unique identifier. Auto-generates UUID for local records, accepts text IDs from sync/import.';
COMMENT ON COLUMN public.leads.raw IS 'Complete raw data as JSON for audit and backup purposes.';
COMMENT ON COLUMN public.leads.scouter IS 'Name of the scouter who created the lead.';
COMMENT ON COLUMN public.leads.projeto IS 'Project name associated with the lead.';
COMMENT ON COLUMN public.leads.criado IS 'Creation date of the lead.';
COMMENT ON COLUMN public.leads.valor_ficha IS 'Value/price of the ficha.';
COMMENT ON COLUMN public.leads.deleted IS 'Soft delete flag. True means the record is deleted.';

COMMENT ON COLUMN public.leads.nome IS 'Full name of the lead.';
COMMENT ON COLUMN public.leads.name IS 'Alternative name field for compatibility.';
COMMENT ON COLUMN public.leads.responsible IS 'Person responsible for the lead.';
COMMENT ON COLUMN public.leads.age IS 'Age of the lead.';
COMMENT ON COLUMN public.leads.idade IS 'Alternative age field for compatibility.';
COMMENT ON COLUMN public.leads.address IS 'Complete address.';
COMMENT ON COLUMN public.leads.photo_url IS 'URL of the lead photo.';
COMMENT ON COLUMN public.leads.foto IS 'Alternative photo field.';

COMMENT ON COLUMN public.leads.telefone IS 'Primary phone number.';
COMMENT ON COLUMN public.leads.celular IS 'Mobile phone number.';
COMMENT ON COLUMN public.leads.telefone_trabalho IS 'Work phone number.';
COMMENT ON COLUMN public.leads.telefone_casa IS 'Home phone number.';
COMMENT ON COLUMN public.leads.email IS 'Email address.';

COMMENT ON COLUMN public.leads.latitude IS 'Latitude coordinate for geolocation.';
COMMENT ON COLUMN public.leads.longitude IS 'Longitude coordinate for geolocation.';
COMMENT ON COLUMN public.leads.localizacao IS 'Location description text.';

COMMENT ON COLUMN public.leads.bitrix_telemarketing_id IS 'ID in Bitrix CRM telemarketing.';
COMMENT ON COLUMN public.leads.commercial_project_id IS 'Commercial project UUID reference.';
COMMENT ON COLUMN public.leads.responsible_user_id IS 'Responsible user UUID reference.';
COMMENT ON COLUMN public.leads.fonte IS 'Source/origin of the lead.';

COMMENT ON COLUMN public.leads.modelo IS 'Model name.';
COMMENT ON COLUMN public.leads.nome_modelo IS 'Alternative model name field.';
COMMENT ON COLUMN public.leads.local_abordagem IS 'Approach location.';
COMMENT ON COLUMN public.leads.local_da_abordagem IS 'Alternative approach location field.';

COMMENT ON COLUMN public.leads.ficha_confirmada IS 'Whether the ficha is confirmed.';
COMMENT ON COLUMN public.leads.data_criacao_ficha IS 'Ficha creation date/time.';
COMMENT ON COLUMN public.leads.data_confirmacao_ficha IS 'Ficha confirmation date/time.';
COMMENT ON COLUMN public.leads.cadastro_existe_foto IS 'Whether photo exists in registration.';

COMMENT ON COLUMN public.leads.presenca_confirmada IS 'Whether presence is confirmed.';
COMMENT ON COLUMN public.leads.compareceu IS 'Whether the lead actually attended.';
COMMENT ON COLUMN public.leads.confirmado IS 'Confirmation text indicator.';

COMMENT ON COLUMN public.leads.agendado IS 'Scheduling indicator.';
COMMENT ON COLUMN public.leads.data_criacao_agendamento IS 'Scheduling creation date/time.';
COMMENT ON COLUMN public.leads.horario_agendamento IS 'Scheduling time.';
COMMENT ON COLUMN public.leads.data_agendamento IS 'Scheduling date.';
COMMENT ON COLUMN public.leads.hora_criacao_ficha IS 'Ficha creation time.';
COMMENT ON COLUMN public.leads.data_retorno_ligacao IS 'Call return scheduled date.';

COMMENT ON COLUMN public.leads.etapa IS 'Current stage in the process.';
COMMENT ON COLUMN public.leads.gerenciamento_funil IS 'Funnel management information.';
COMMENT ON COLUMN public.leads.status_fluxo IS 'Current flow status.';
COMMENT ON COLUMN public.leads.etapa_funil IS 'Funnel stage.';
COMMENT ON COLUMN public.leads.etapa_fluxo IS 'Flow stage.';
COMMENT ON COLUMN public.leads.funil_fichas IS 'Fichas funnel information.';
COMMENT ON COLUMN public.leads.status_tabulacao IS 'Tabulation status.';
COMMENT ON COLUMN public.leads.tabulacao IS 'Tabulation field.';

COMMENT ON COLUMN public.leads.aprovado IS 'Approval status (true/false/null).';
COMMENT ON COLUMN public.leads.supervisor IS 'Supervisor name.';
COMMENT ON COLUMN public.leads.supervisor_do_scouter IS 'Alternative supervisor field.';

COMMENT ON COLUMN public.leads.maxsystem_id_ficha IS 'Ficha ID in MaxSystem.';
COMMENT ON COLUMN public.leads.gestao_scouter IS 'Gestão Scouter system identifier.';
COMMENT ON COLUMN public.leads.op_telemarketing IS 'Telemarketing operator.';

COMMENT ON COLUMN public.leads.date_modify IS 'Last modification date/time.';
COMMENT ON COLUMN public.leads.last_sync_at IS 'Last sync timestamp (TabuladorMax).';
COMMENT ON COLUMN public.leads.last_synced_at IS 'Last sync timestamp (Gestão Scouter).';
COMMENT ON COLUMN public.leads.sync_status IS 'Sync status: pending, synced, error.';

COMMENT ON COLUMN public.leads.created_at IS 'Record creation timestamp.';
COMMENT ON COLUMN public.leads.updated_at IS 'Last update timestamp (auto-updated).';

-- ============================================================================
-- PHASE 6: MIGRATE DATA FROM FICHAS TO LEADS
-- ============================================================================

-- Insert all data from fichas into leads
-- Map fields appropriately, handling both old and new field names
INSERT INTO public.leads (
  id, raw, scouter, projeto, criado, valor_ficha, deleted,
  nome, telefone, email, latitude, longitude, localizacao,
  modelo, etapa, idade, foto, supervisor, tabulacao,
  agendado, confirmado, compareceu, local_da_abordagem,
  cadastro_existe_foto, presenca_confirmada, ficha_confirmada,
  hora_criacao_ficha, aprovado, supervisor_do_scouter,
  name, responsible, age, address, photo_url,
  celular, telefone_trabalho, telefone_casa,
  bitrix_telemarketing_id, commercial_project_id, responsible_user_id,
  fonte, nome_modelo, local_abordagem,
  data_criacao_ficha, data_confirmacao_ficha,
  data_criacao_agendamento, horario_agendamento, data_agendamento,
  data_retorno_ligacao, gerenciamento_funil, status_fluxo,
  etapa_funil, etapa_fluxo, funil_fichas, status_tabulacao,
  maxsystem_id_ficha, gestao_scouter, op_telemarketing,
  date_modify, last_sync_at, last_synced_at, sync_status,
  created_at, updated_at
)
SELECT 
  f.id, 
  COALESCE(f.raw, '{}'::jsonb), 
  f.scouter, 
  f.projeto, 
  f.criado, 
  f.valor_ficha, 
  COALESCE(f.deleted, false),
  f.nome, 
  f.telefone, 
  f.email, 
  f.latitude, 
  f.longitude, 
  f.localizacao,
  f.modelo, 
  f.etapa, 
  f.idade, 
  f.foto, 
  f.supervisor, 
  f.tabulacao,
  f.agendado, 
  f.confirmado, 
  f.compareceu, 
  f.local_da_abordagem,
  f.cadastro_existe_foto, 
  f.presenca_confirmada, 
  f.ficha_confirmada,
  f.hora_criacao_ficha, 
  f.aprovado, 
  f.supervisor_do_scouter,
  f.name, 
  f.responsible, 
  f.age, 
  f.address, 
  f.photo_url,
  f.celular, 
  f.telefone_trabalho, 
  f.telefone_casa,
  f.bitrix_telemarketing_id, 
  f.commercial_project_id, 
  f.responsible_user_id,
  f.fonte, 
  f.nome_modelo, 
  f.local_abordagem,
  f.data_criacao_ficha, 
  f.data_confirmacao_ficha,
  f.data_criacao_agendamento, 
  f.horario_agendamento, 
  f.data_agendamento,
  f.data_retorno_ligacao, 
  f.gerenciamento_funil, 
  f.status_fluxo,
  f.etapa_funil, 
  f.etapa_fluxo, 
  f.funil_fichas, 
  f.status_tabulacao,
  f.maxsystem_id_ficha, 
  f.gestao_scouter, 
  f.op_telemarketing,
  f.date_modify, 
  f.last_sync_at, 
  f.last_synced_at, 
  f.sync_status,
  COALESCE(f.created_at, now()), 
  COALESCE(f.updated_at, now())
FROM public.fichas f
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHASE 7: CREATE COMPATIBILITY VIEW FOR ROLLBACK
-- ============================================================================

-- Create a view that maps leads back to fichas structure for emergency rollback
CREATE OR REPLACE VIEW public.fichas_compat AS
SELECT 
  id, raw, scouter, projeto, criado, valor_ficha, deleted,
  nome, telefone, email, latitude, longitude, localizacao,
  modelo, etapa, idade, foto, supervisor, tabulacao,
  agendado, confirmado, compareceu, local_da_abordagem,
  cadastro_existe_foto, presenca_confirmada, ficha_confirmada,
  hora_criacao_ficha, aprovado, supervisor_do_scouter,
  name, responsible, age, address, photo_url,
  celular, telefone_trabalho, telefone_casa,
  bitrix_telemarketing_id, commercial_project_id, responsible_user_id,
  fonte, nome_modelo, local_abordagem,
  data_criacao_ficha, data_confirmacao_ficha,
  data_criacao_agendamento, horario_agendamento, data_agendamento,
  data_retorno_ligacao, gerenciamento_funil, status_fluxo,
  etapa_funil, etapa_fluxo, funil_fichas, status_tabulacao,
  maxsystem_id_ficha, gestao_scouter, op_telemarketing,
  date_modify, last_sync_at, last_synced_at, sync_status,
  created_at, updated_at
FROM public.leads;

COMMENT ON VIEW public.fichas_compat IS 'Compatibility view mapping leads to fichas structure. For emergency rollback only. DO NOT use in production code.';

-- ============================================================================
-- PHASE 8: UPDATE SYNC_QUEUE TABLE TO REFERENCE LEADS
-- ============================================================================

-- Update any existing references in sync_queue from 'fichas' to 'leads'
UPDATE public.sync_queue 
SET table_name = 'leads' 
WHERE table_name = 'fichas';

-- ============================================================================
-- PHASE 9: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  fichas_count INTEGER;
  leads_count INTEGER;
  leads_columns INTEGER;
  expected_columns INTEGER := 70; -- Approximate expected column count
BEGIN
  -- Count records in fichas
  SELECT COUNT(*) INTO fichas_count FROM public.fichas;
  
  -- Count records in leads
  SELECT COUNT(*) INTO leads_count FROM public.leads;
  
  -- Count columns in leads table
  SELECT COUNT(*) INTO leads_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'leads';
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'MIGRATION VERIFICATION REPORT';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Records in fichas table: %', fichas_count;
  RAISE NOTICE 'Records in leads table: %', leads_count;
  RAISE NOTICE 'Columns in leads table: %', leads_columns;
  RAISE NOTICE '';
  
  IF leads_count >= fichas_count THEN
    RAISE NOTICE '✅ Data migration successful: All records migrated';
  ELSE
    RAISE WARNING '⚠️ Data migration incomplete: % records missing', (fichas_count - leads_count);
  END IF;
  
  IF leads_columns >= expected_columns THEN
    RAISE NOTICE '✅ Schema complete: % columns created', leads_columns;
  ELSE
    RAISE WARNING '⚠️ Schema incomplete: Expected ~% columns, found %', expected_columns, leads_columns;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update application code to use table "leads" instead of "fichas"';
  RAISE NOTICE '2. Test all functionality thoroughly';
  RAISE NOTICE '3. Once validated, run: DROP TABLE public.fichas;';
  RAISE NOTICE '4. Optionally drop view: DROP VIEW public.fichas_compat;';
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- PHASE 10: DROP FICHAS TABLE (COMMENTED OUT FOR SAFETY)
-- ============================================================================

-- ⚠️ IMPORTANT: Only uncomment and run after thorough validation
-- ⚠️ Ensure all application code is updated and tested first
-- ⚠️ Keep a backup of the database before dropping

-- DROP TABLE IF EXISTS public.fichas CASCADE;

-- RAISE NOTICE '✅ Table public.fichas dropped successfully';
-- RAISE NOTICE '✅ Migration from fichas to leads is complete';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '✅ MIGRATION SCRIPT COMPLETED SUCCESSFULLY';
RAISE NOTICE '';
RAISE NOTICE '⚠️ IMPORTANT REMINDERS:';
RAISE NOTICE '- The fichas table still exists for safety';
RAISE NOTICE '- Update all application code to use "leads" table';
RAISE NOTICE '- Test thoroughly before dropping fichas table';
RAISE NOTICE '- Run DROP TABLE public.fichas; only after validation';
RAISE NOTICE '';
