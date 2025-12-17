-- Create telemarketing_quick_texts table
CREATE TABLE public.telemarketing_quick_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  shortcut TEXT,
  commercial_project_id UUID REFERENCES commercial_projects(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_quick_texts_project ON public.telemarketing_quick_texts(commercial_project_id);
CREATE INDEX idx_quick_texts_active ON public.telemarketing_quick_texts(is_active);
CREATE INDEX idx_quick_texts_shortcut ON public.telemarketing_quick_texts(shortcut);

-- Enable RLS
ALTER TABLE public.telemarketing_quick_texts ENABLE ROW LEVEL SECURITY;

-- Admins and managers have full access
CREATE POLICY "Admins and managers full access to quick texts"
ON public.telemarketing_quick_texts
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Supervisors can manage quick texts for their project
CREATE POLICY "Supervisors can manage project quick texts"
ON public.telemarketing_quick_texts
FOR ALL
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

-- Agents can view active quick texts for their project
CREATE POLICY "Agents can view project quick texts"
ON public.telemarketing_quick_texts
FOR SELECT
USING (
  is_active = true AND
  commercial_project_id IN (
    SELECT commercial_project_id 
    FROM agent_telemarketing_mapping 
    WHERE tabuladormax_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_quick_texts_updated_at
BEFORE UPDATE ON public.telemarketing_quick_texts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();