-- ============================================
-- Flow Builder v2 - Data Migration Script
-- ============================================
-- Migrates existing flows from v1 schema to flow_versions table
-- Each existing flow will be created as version 1

DO $$
DECLARE
  flow_record RECORD;
  new_version_id UUID;
  flow_definition JSONB;
BEGIN
  -- Loop through all existing flows
  FOR flow_record IN 
    SELECT id, nome, descricao, steps, ativo, criado_em, criado_por, atualizado_em
    FROM public.flows
    WHERE current_version_id IS NULL  -- Only migrate flows that haven't been migrated yet
  LOOP
    -- Build the flow definition from existing flow data
    flow_definition := jsonb_build_object(
      'steps', flow_record.steps,
      'metadata', jsonb_build_object(
        'criado_em', flow_record.criado_em,
        'atualizado_em', flow_record.atualizado_em
      )
    );
    
    -- Validate the definition
    PERFORM public.validate_flow_definition(flow_definition, 'v1');
    
    -- Create version 1 for this flow
    INSERT INTO public.flow_versions (
      flow_id,
      version_number,
      nome,
      descricao,
      definition,
      schema_version,
      is_active,
      criado_em,
      criado_por,
      notas_versao
    ) VALUES (
      flow_record.id,
      1,
      flow_record.nome,
      flow_record.descricao,
      flow_definition,
      'v1',
      true,  -- Set as active version
      flow_record.criado_em,
      flow_record.criado_por,
      'Migrated from flows v1 to flow_versions'
    ) RETURNING id INTO new_version_id;
    
    -- Update the flow to reference this version
    UPDATE public.flows
    SET current_version_id = new_version_id
    WHERE id = flow_record.id;
    
    RAISE NOTICE 'Migrated flow % (%) to version 1', flow_record.nome, flow_record.id;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END $$;

-- Add a comment to document the migration
COMMENT ON TABLE public.flow_versions IS 'Stores versioned flow definitions. Existing flows have been migrated to version 1.';
