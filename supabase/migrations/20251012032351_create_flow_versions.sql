-- ============================================
-- Flow Builder v2 - Versioning Infrastructure
-- ============================================
-- Migration to add flow_versions table for version tracking and history
-- This enables proper versioning of flows with validation and rollback support

-- Create flow_versions table
CREATE TABLE IF NOT EXISTS public.flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  definition JSONB NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notas_versao TEXT,
  
  -- Ensure version uniqueness per flow
  CONSTRAINT flow_versions_unique_version UNIQUE (flow_id, version_number),
  
  -- Validate definition is an object
  CONSTRAINT flow_versions_definition_is_object CHECK (jsonb_typeof(definition) = 'object'),
  
  -- Validate schema version format
  CONSTRAINT flow_versions_schema_version_format CHECK (schema_version ~ '^v[0-9]+$')
);

-- Add version reference to flows table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'current_version_id'
  ) THEN
    ALTER TABLE public.flows ADD COLUMN current_version_id UUID REFERENCES public.flow_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flow_versions_flow_id ON public.flow_versions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_versions_active ON public.flow_versions(flow_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flow_versions_schema ON public.flow_versions(schema_version);
CREATE INDEX IF NOT EXISTS idx_flow_versions_criado_por ON public.flow_versions(criado_por);
CREATE INDEX IF NOT EXISTS idx_flows_current_version ON public.flows(current_version_id);

-- Enable RLS
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flow_versions table
DROP POLICY IF EXISTS "Authenticated users can view all flow versions" ON public.flow_versions;
DROP POLICY IF EXISTS "Admins and managers can create flow versions" ON public.flow_versions;
DROP POLICY IF EXISTS "Admins and managers can update flow versions" ON public.flow_versions;

CREATE POLICY "Authenticated users can view all flow versions"
  ON public.flow_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can create flow versions"
  ON public.flow_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update flow versions"
  ON public.flow_versions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.flow_versions TO authenticated;

-- Create function to get next version number
CREATE OR REPLACE FUNCTION public.get_next_flow_version(p_flow_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_max_version
  FROM public.flow_versions
  WHERE flow_id = p_flow_id;
  
  RETURN v_max_version;
END;
$$;

-- Create function to activate a flow version
CREATE OR REPLACE FUNCTION public.activate_flow_version(p_version_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flow_id UUID;
BEGIN
  -- Get the flow_id for this version
  SELECT flow_id INTO v_flow_id
  FROM public.flow_versions
  WHERE id = p_version_id;
  
  IF v_flow_id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;
  
  -- Deactivate all versions of this flow
  UPDATE public.flow_versions
  SET is_active = false
  WHERE flow_id = v_flow_id;
  
  -- Activate the specified version
  UPDATE public.flow_versions
  SET is_active = true
  WHERE id = p_version_id;
  
  -- Update the flow's current_version_id
  UPDATE public.flows
  SET current_version_id = p_version_id
  WHERE id = v_flow_id;
  
  RETURN true;
END;
$$;

-- Create function to validate flow definition against schema
CREATE OR REPLACE FUNCTION public.validate_flow_definition(p_definition JSONB, p_schema_version TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Basic validation for v1 schema
  IF p_schema_version = 'v1' THEN
    -- Must have steps array
    IF NOT (p_definition ? 'steps') THEN
      RAISE EXCEPTION 'Flow definition must contain "steps" array';
    END IF;
    
    IF jsonb_typeof(p_definition->'steps') != 'array' THEN
      RAISE EXCEPTION 'Flow definition "steps" must be an array';
    END IF;
    
    -- Each step must have required fields
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_definition->'steps') AS step
      WHERE NOT (step ? 'id' AND step ? 'type' AND step ? 'nome' AND step ? 'config')
    ) THEN
      RAISE EXCEPTION 'Each step must have id, type, nome, and config fields';
    END IF;
    
    -- Validate step types
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_definition->'steps') AS step
      WHERE step->>'type' NOT IN ('tabular', 'http_call', 'wait')
    ) THEN
      RAISE EXCEPTION 'Invalid step type. Allowed: tabular, http_call, wait';
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.flow_versions IS 'Stores versioned flow definitions with complete history and validation';
COMMENT ON COLUMN public.flow_versions.definition IS 'Complete flow definition in JSON format including steps and metadata';
COMMENT ON COLUMN public.flow_versions.schema_version IS 'Schema version identifier (e.g., v1, v2) for validation';
COMMENT ON COLUMN public.flow_versions.is_active IS 'Indicates if this is the currently active version of the flow';
COMMENT ON COLUMN public.flow_versions.version_number IS 'Sequential version number starting from 1';
COMMENT ON FUNCTION public.get_next_flow_version IS 'Returns the next available version number for a flow';
COMMENT ON FUNCTION public.activate_flow_version IS 'Activates a specific version and deactivates others';
COMMENT ON FUNCTION public.validate_flow_definition IS 'Validates flow definition against the specified schema version';
