-- Create app_resources table for defining resources with scope-based permissions
CREATE TABLE public.app_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create resource_permissions table for storing scope per role
CREATE TABLE public.resource_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.app_resources(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource_id, role_id)
);

-- Enable RLS
ALTER TABLE public.app_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_resources
CREATE POLICY "Todos podem ver recursos ativos" ON public.app_resources
  FOR SELECT USING (active = true);

CREATE POLICY "Admins gerenciam recursos" ON public.app_resources
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for resource_permissions
CREATE POLICY "Todos podem ver permissões de recursos" ON public.resource_permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam permissões de recursos" ON public.resource_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial resources
INSERT INTO public.app_resources (name, code, module, sort_order) VALUES
  ('Visualizar Leads', 'leads.view', 'Leads', 1),
  ('Editar Leads', 'leads.edit', 'Leads', 2),
  ('Excluir Leads', 'leads.delete', 'Leads', 3),
  ('Visualizar Conversas', 'whatsapp.view', 'WhatsApp', 1),
  ('Enviar Mensagens', 'whatsapp.send', 'WhatsApp', 2),
  ('Visualizar Scouters', 'scouters.view', 'Scouters', 1),
  ('Gerenciar Scouters', 'scouters.manage', 'Scouters', 2);