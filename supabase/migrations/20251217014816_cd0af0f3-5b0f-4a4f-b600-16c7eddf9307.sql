-- Create telemarketing_scripts table
CREATE TABLE public.telemarketing_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  
  -- Project link
  commercial_project_id UUID REFERENCES public.commercial_projects(id),
  
  -- Control
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  -- AI Analysis
  ai_analysis JSONB,
  ai_score INTEGER,
  ai_analyzed_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telemarketing_scripts ENABLE ROW LEVEL SECURITY;

-- Admins and managers have full access
CREATE POLICY "Admins and managers full access to scripts"
ON public.telemarketing_scripts FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Supervisors can manage scripts of their project
CREATE POLICY "Supervisors can manage project scripts"
ON public.telemarketing_scripts FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND
  commercial_project_id IN (
    SELECT commercial_project_id 
    FROM agent_telemarketing_mapping 
    WHERE tabuladormax_user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role) AND
  commercial_project_id IN (
    SELECT commercial_project_id 
    FROM agent_telemarketing_mapping 
    WHERE tabuladormax_user_id = auth.uid()
  )
);

-- Agents can view active scripts of their project
CREATE POLICY "Agents can view project scripts"
ON public.telemarketing_scripts FOR SELECT
TO authenticated
USING (
  is_active = true AND
  commercial_project_id IN (
    SELECT commercial_project_id 
    FROM agent_telemarketing_mapping 
    WHERE tabuladormax_user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_telemarketing_scripts_updated_at
BEFORE UPDATE ON public.telemarketing_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();