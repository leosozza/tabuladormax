-- Tabela de funções customizadas
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 100,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_system BOOLEAN DEFAULT false
);

-- Inserir roles do sistema
INSERT INTO public.custom_roles (name, label, is_system, color, sort_order) VALUES
  ('admin', 'Administrador', true, '#dc2626', 1),
  ('manager', 'Gerente', true, '#2563eb', 2),
  ('supervisor', 'Supervisor', true, '#7c3aed', 3),
  ('agent', 'Agente', true, '#16a34a', 4);

-- RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver roles" ON public.custom_roles
  FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam roles" ON public.custom_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));