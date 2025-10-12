-- ============================================
-- Flows v2 Foundation - Database Migration
-- ============================================
-- This migration creates the foundational infrastructure for Flows v2
-- with versioning support, converting the single-table flow system
-- to a more robust architecture with versioned flows.

-- ============================================
-- 1. CREATE NEW TABLES FOR FLOWS V2
-- ============================================

-- flow_definitions: Stores flow metadata (name, description, owner)
CREATE TABLE IF NOT EXISTS public.flow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT flow_definitions_nome_not_empty CHECK (length(trim(nome)) > 0)
);

-- flow_versions: Stores versioned flow configurations
CREATE TABLE IF NOT EXISTS public.flow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_definition_id UUID NOT NULL REFERENCES public.flow_definitions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  change_notes TEXT,
  CONSTRAINT flow_versions_steps_is_array CHECK (jsonb_typeof(steps) = 'array'),
  CONSTRAINT flow_versions_unique_version UNIQUE (flow_definition_id, version_number)
);

-- flow_executions: Enhanced execution tracking (replaces flows_runs)
CREATE TABLE IF NOT EXISTS public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_definition_id UUID NOT NULL REFERENCES public.flow_definitions(id) ON DELETE CASCADE,
  flow_version_id UUID NOT NULL REFERENCES public.flow_versions(id) ON DELETE CASCADE,
  lead_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  logs JSONB DEFAULT '[]'::jsonb,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT flow_executions_logs_is_array CHECK (jsonb_typeof(logs) = 'array')
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_flow_definitions_active ON public.flow_definitions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flow_definitions_created_by ON public.flow_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_flow_definitions_created_at ON public.flow_definitions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flow_versions_flow_def ON public.flow_versions(flow_definition_id);
CREATE INDEX IF NOT EXISTS idx_flow_versions_status ON public.flow_versions(status);
CREATE INDEX IF NOT EXISTS idx_flow_versions_version_number ON public.flow_versions(flow_definition_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_flow_versions_published ON public.flow_versions(flow_definition_id, published_at DESC) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_def ON public.flow_executions(flow_definition_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_version ON public.flow_executions(flow_version_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_lead ON public.flow_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_status ON public.flow_executions(status);
CREATE INDEX IF NOT EXISTS idx_flow_executions_executed_by ON public.flow_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_flow_executions_started_at ON public.flow_executions(started_at DESC);

-- ============================================
-- 3. CREATE TRIGGERS
-- ============================================

-- Trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for flow_definitions
DROP TRIGGER IF EXISTS set_updated_at_flow_definitions ON public.flow_definitions;
CREATE TRIGGER set_updated_at_flow_definitions
  BEFORE UPDATE ON public.flow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_timestamp();

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.flow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- Policies for flow_definitions
DROP POLICY IF EXISTS "Authenticated users can view active flow definitions" ON public.flow_definitions;
CREATE POLICY "Authenticated users can view active flow definitions"
  ON public.flow_definitions FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager')
  ));

DROP POLICY IF EXISTS "Admins and managers can create flow definitions" ON public.flow_definitions;
CREATE POLICY "Admins and managers can create flow definitions"
  ON public.flow_definitions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update flow definitions" ON public.flow_definitions;
CREATE POLICY "Admins and managers can update flow definitions"
  ON public.flow_definitions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete flow definitions" ON public.flow_definitions;
CREATE POLICY "Admins can delete flow definitions"
  ON public.flow_definitions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for flow_versions
DROP POLICY IF EXISTS "Users can view published flow versions" ON public.flow_versions;
CREATE POLICY "Users can view published flow versions"
  ON public.flow_versions FOR SELECT
  TO authenticated
  USING (
    status = 'published' OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can create flow versions" ON public.flow_versions;
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

DROP POLICY IF EXISTS "Admins and managers can update flow versions" ON public.flow_versions;
CREATE POLICY "Admins and managers can update flow versions"
  ON public.flow_versions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete flow versions" ON public.flow_versions;
CREATE POLICY "Admins can delete flow versions"
  ON public.flow_versions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policies for flow_executions
DROP POLICY IF EXISTS "Users can view their own flow executions" ON public.flow_executions;
CREATE POLICY "Users can view their own flow executions"
  ON public.flow_executions FOR SELECT
  TO authenticated
  USING (
    executed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create flow executions" ON public.flow_executions;
CREATE POLICY "Authenticated users can create flow executions"
  ON public.flow_executions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update flow executions" ON public.flow_executions;
CREATE POLICY "System can update flow executions"
  ON public.flow_executions FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.flow_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.flow_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.flow_executions TO authenticated;
GRANT DELETE ON public.flow_definitions TO authenticated;
GRANT DELETE ON public.flow_versions TO authenticated;

-- ============================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.flow_definitions IS 'Stores flow metadata and configuration (Flows v2)';
COMMENT ON TABLE public.flow_versions IS 'Stores versioned flow configurations with steps (Flows v2)';
COMMENT ON TABLE public.flow_executions IS 'Stores execution history and logs for flow runs (Flows v2)';

COMMENT ON COLUMN public.flow_definitions.nome IS 'Flow name';
COMMENT ON COLUMN public.flow_definitions.descricao IS 'Flow description';
COMMENT ON COLUMN public.flow_definitions.is_active IS 'Whether the flow is active';

COMMENT ON COLUMN public.flow_versions.version_number IS 'Sequential version number for the flow';
COMMENT ON COLUMN public.flow_versions.steps IS 'Array of step objects defining the flow sequence';
COMMENT ON COLUMN public.flow_versions.status IS 'Version status: draft, published, or archived';
COMMENT ON COLUMN public.flow_versions.change_notes IS 'Notes about changes in this version';

COMMENT ON COLUMN public.flow_executions.logs IS 'Array of log entries from flow execution';
COMMENT ON COLUMN public.flow_executions.result IS 'Final result or output data from flow execution';
COMMENT ON COLUMN public.flow_executions.context IS 'Execution context and variables';
