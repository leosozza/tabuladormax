
-- Criar tabela de departamentos estruturada
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.departments(id),
  description TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrar departamentos existentes do enum para a tabela
INSERT INTO public.departments (name, code, sort_order) VALUES
  ('Administrativo', 'administrativo', 1),
  ('Telemarketing', 'telemarketing', 2),
  ('Scouters', 'scouters', 3)
ON CONFLICT (code) DO NOTHING;

-- Criar tabela unificada de atribuição de permissões
CREATE TABLE IF NOT EXISTS public.permission_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES public.app_routes(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.app_resources(id) ON DELETE CASCADE,
  
  -- Tipo de atribuição: role, department, user
  assign_type TEXT NOT NULL CHECK (assign_type IN ('role', 'department', 'user')),
  
  -- Referências condicionais (apenas uma será preenchida conforme assign_type)
  role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Configurações de acesso
  scope TEXT DEFAULT 'none' CHECK (scope IN ('global', 'department', 'own', 'none')),
  can_access BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint para garantir que apenas uma referência é preenchida
  CONSTRAINT valid_assignment CHECK (
    (assign_type = 'role' AND role_id IS NOT NULL AND department_id IS NULL AND user_id IS NULL) OR
    (assign_type = 'department' AND department_id IS NOT NULL AND role_id IS NULL AND user_id IS NULL) OR
    (assign_type = 'user' AND user_id IS NOT NULL AND role_id IS NULL AND department_id IS NULL)
  ),
  
  -- Constraint para garantir que route_id ou resource_id está preenchido (não ambos)
  CONSTRAINT valid_target CHECK (
    (route_id IS NOT NULL AND resource_id IS NULL) OR
    (resource_id IS NOT NULL AND route_id IS NULL)
  )
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_permission_assignments_route ON public.permission_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_resource ON public.permission_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_role ON public.permission_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_department ON public.permission_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_permission_assignments_user ON public.permission_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_id);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para departments
CREATE POLICY "Todos podem ver departamentos ativos"
  ON public.departments FOR SELECT
  USING (active = true);

CREATE POLICY "Admins gerenciam departamentos"
  ON public.departments FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Políticas para permission_assignments
CREATE POLICY "Admins podem gerenciar atribuições"
  ON public.permission_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver suas próprias atribuições"
  ON public.permission_assignments FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permission_assignments_updated_at
  BEFORE UPDATE ON public.permission_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
