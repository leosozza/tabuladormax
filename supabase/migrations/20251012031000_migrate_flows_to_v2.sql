-- ============================================
-- Migrate Existing Flows to Flows v2
-- ============================================
-- This migration script converts existing flows from the v1 schema
-- (single flows table) to the v2 schema (flow_definitions + flow_versions)

-- ============================================
-- 1. MIGRATE FLOWS TO FLOW_DEFINITIONS AND FLOW_VERSIONS
-- ============================================

DO $$
DECLARE
  flow_record RECORD;
  new_definition_id UUID;
  new_version_id UUID;
BEGIN
  -- Check if the old flows table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flows') THEN
    
    RAISE NOTICE 'Migrating existing flows to v2 architecture...';
    
    -- Iterate through all existing flows
    FOR flow_record IN SELECT * FROM public.flows ORDER BY criado_em LOOP
      
      RAISE NOTICE 'Migrating flow: % (ID: %)', flow_record.nome, flow_record.id;
      
      -- Create flow_definition entry
      INSERT INTO public.flow_definitions (
        id,
        nome,
        descricao,
        created_by,
        created_at,
        updated_at,
        is_active
      ) VALUES (
        flow_record.id,  -- Preserve original ID
        flow_record.nome,
        flow_record.descricao,
        flow_record.criado_por,
        flow_record.criado_em,
        flow_record.atualizado_em,
        flow_record.ativo
      )
      ON CONFLICT (id) DO NOTHING  -- Skip if already migrated
      RETURNING id INTO new_definition_id;
      
      -- Only create version if definition was newly inserted
      IF new_definition_id IS NOT NULL THEN
        -- Create flow_version entry (version 1)
        INSERT INTO public.flow_versions (
          flow_definition_id,
          version_number,
          steps,
          status,
          published_at,
          created_by,
          created_at,
          change_notes
        ) VALUES (
          new_definition_id,
          1,  -- First version
          flow_record.steps,
          CASE 
            WHEN flow_record.ativo THEN 'published'
            ELSE 'archived'
          END,
          CASE 
            WHEN flow_record.ativo THEN flow_record.criado_em
            ELSE NULL
          END,
          flow_record.criado_por,
          flow_record.criado_em,
          'Migrated from Flows v1'
        )
        RETURNING id INTO new_version_id;
        
        RAISE NOTICE 'Created definition: % and version: %', new_definition_id, new_version_id;
      ELSE
        RAISE NOTICE 'Flow definition already exists, skipping: %', flow_record.id;
      END IF;
      
    END LOOP;
    
    RAISE NOTICE 'Flow migration completed.';
    
  ELSE
    RAISE NOTICE 'Old flows table does not exist, skipping flow migration.';
  END IF;
  
END $$;

-- ============================================
-- 2. MIGRATE FLOWS_RUNS TO FLOW_EXECUTIONS
-- ============================================

DO $$
DECLARE
  run_record RECORD;
  version_id UUID;
BEGIN
  -- Check if the old flows_runs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flows_runs') THEN
    
    RAISE NOTICE 'Migrating existing flow runs to v2 architecture...';
    
    -- Iterate through all existing flow runs
    FOR run_record IN SELECT * FROM public.flows_runs ORDER BY iniciado_em LOOP
      
      -- Find the corresponding flow_version (should be version 1 from migration above)
      SELECT id INTO version_id
      FROM public.flow_versions
      WHERE flow_definition_id = run_record.flow_id
        AND version_number = 1
      LIMIT 1;
      
      IF version_id IS NOT NULL THEN
        -- Create flow_execution entry
        INSERT INTO public.flow_executions (
          id,
          flow_definition_id,
          flow_version_id,
          lead_id,
          status,
          logs,
          result,
          error_message,
          started_at,
          finished_at,
          executed_by,
          context
        ) VALUES (
          run_record.id,  -- Preserve original ID
          run_record.flow_id,
          version_id,
          run_record.lead_id,
          run_record.status,
          run_record.logs,
          run_record.resultado,
          NULL,  -- error_message didn't exist in v1
          run_record.iniciado_em,
          run_record.finalizado_em,
          run_record.executado_por,
          '{}'::jsonb  -- Empty context for migrated runs
        )
        ON CONFLICT (id) DO NOTHING;  -- Skip if already migrated
        
      ELSE
        RAISE WARNING 'Could not find flow_version for flow_run: % (flow_id: %)', run_record.id, run_record.flow_id;
      END IF;
      
    END LOOP;
    
    RAISE NOTICE 'Flow runs migration completed.';
    
  ELSE
    RAISE NOTICE 'Old flows_runs table does not exist, skipping runs migration.';
  END IF;
  
END $$;

-- ============================================
-- 3. VERIFICATION QUERIES
-- ============================================

-- Log migration statistics
DO $$
DECLARE
  v1_flows_count INTEGER;
  v1_runs_count INTEGER;
  v2_definitions_count INTEGER;
  v2_versions_count INTEGER;
  v2_executions_count INTEGER;
BEGIN
  -- Count v1 records
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flows') THEN
    SELECT COUNT(*) INTO v1_flows_count FROM public.flows;
  ELSE
    v1_flows_count := 0;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flows_runs') THEN
    SELECT COUNT(*) INTO v1_runs_count FROM public.flows_runs;
  ELSE
    v1_runs_count := 0;
  END IF;
  
  -- Count v2 records
  SELECT COUNT(*) INTO v2_definitions_count FROM public.flow_definitions;
  SELECT COUNT(*) INTO v2_versions_count FROM public.flow_versions;
  SELECT COUNT(*) INTO v2_executions_count FROM public.flow_executions;
  
  -- Log results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'V1 Flows: %', v1_flows_count;
  RAISE NOTICE 'V1 Flow Runs: %', v1_runs_count;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'V2 Flow Definitions: %', v2_definitions_count;
  RAISE NOTICE 'V2 Flow Versions: %', v2_versions_count;
  RAISE NOTICE 'V2 Flow Executions: %', v2_executions_count;
  RAISE NOTICE '========================================';
  
END $$;
