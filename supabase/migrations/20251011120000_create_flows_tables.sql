-- Flows automation tables
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'org', 'public')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flows_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed')),
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB,
  logs JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.button_config
ADD COLUMN IF NOT EXISTS flow_id UUID REFERENCES public.flows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flows_created_by ON public.flows(created_by);
CREATE INDEX IF NOT EXISTS idx_flows_visibility ON public.flows(visibility);
CREATE INDEX IF NOT EXISTS idx_flows_runs_flow_id ON public.flows_runs(flow_id);
CREATE INDEX IF NOT EXISTS idx_flows_runs_created_by ON public.flows_runs(created_by);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows_runs ENABLE ROW LEVEL SECURITY;

-- Owners can manage their flows, admins can manage all, authed users can read visible flows
DROP POLICY IF EXISTS "Flows all access" ON public.flows;
DROP POLICY IF EXISTS "Flows all access" ON public.flows_runs;

CREATE POLICY "Flows are viewable by authenticated users" 
  ON public.flows FOR SELECT
  TO authenticated
  USING (
    visibility = 'public' OR
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Flow owners can modify" 
  ON public.flows FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Flow owners can update" 
  ON public.flows FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Flow owners can delete" 
  ON public.flows FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert flows for anyone" 
  ON public.flows FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Runs are viewable by related users" 
  ON public.flows_runs FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flows_runs.flow_id
        AND (
          f.created_by = auth.uid() OR
          f.visibility = 'public' OR
          public.has_role(auth.uid(), 'admin') OR
          public.has_role(auth.uid(), 'manager')
        )
    )
  );

CREATE POLICY "Runs can be inserted by authenticated users" 
  ON public.flows_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update runs" 
  ON public.flows_runs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_flows_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flows_updated_at ON public.flows;
CREATE TRIGGER trg_flows_updated_at
  BEFORE UPDATE ON public.flows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_flows_updated_at();
