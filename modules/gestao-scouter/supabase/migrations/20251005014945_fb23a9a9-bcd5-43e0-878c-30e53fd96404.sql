-- Sistema de controle de acesso baseado no modelo Bitrix24

-- 1. Tabela de roles (papéis)
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de permissions (permissões por módulo e ação)
CREATE TABLE IF NOT EXISTS public.permissions (
  id SERIAL PRIMARY KEY,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  role_id INT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module, action, role_id)
);

-- 3. Tabela de users (vincula auth.users com roles e scouters)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id INT NOT NULL REFERENCES public.roles(id),
  scouter_id BIGINT NULL,
  supervisor_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. View de permissões efetivas do usuário
CREATE OR REPLACE VIEW public.user_permissions AS
SELECT 
  u.id AS user_id, 
  u.name AS user_name,
  r.name AS role, 
  p.module, 
  p.action, 
  p.allowed
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
JOIN public.permissions p ON p.role_id = r.id;

-- 5. Seed inicial de roles
INSERT INTO public.roles (name, description) VALUES
('scouter', 'Acesso apenas aos próprios registros'),
('supervisor', 'Gerencia scouters da equipe'),
('admin', 'Acesso completo ao sistema')
ON CONFLICT (name) DO NOTHING;

-- 6. Seed inicial de permissions
INSERT INTO public.permissions (module, action, role_id, allowed)
SELECT 'fichas', 'read', id, true FROM public.roles WHERE name='scouter'
UNION ALL
SELECT 'fichas', 'create', id, true FROM public.roles WHERE name='scouter'
UNION ALL
SELECT 'fichas', 'update', id, true FROM public.roles WHERE name='scouter'
UNION ALL
SELECT 'leads', 'read', id, true FROM public.roles WHERE name='scouter'
UNION ALL
SELECT 'dashboard', 'read', id, true FROM public.roles WHERE name='scouter'
UNION ALL
SELECT 'fichas', 'read', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'fichas', 'create', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'fichas', 'update', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'fichas', 'delete', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'fichas', 'export', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'leads', 'read', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'leads', 'create', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'leads', 'update', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'leads', 'export', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'dashboard', 'read', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'dashboard', 'export', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'pagamentos', 'read', id, true FROM public.roles WHERE name='supervisor'
UNION ALL
SELECT 'fichas', 'read', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'fichas', 'create', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'fichas', 'update', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'fichas', 'delete', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'fichas', 'export', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'leads', 'read', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'leads', 'create', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'leads', 'update', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'leads', 'delete', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'leads', 'export', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'dashboard', 'read', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'dashboard', 'export', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'pagamentos', 'read', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'pagamentos', 'create', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'pagamentos', 'update', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'pagamentos', 'delete', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'pagamentos', 'export', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'configuracoes', 'read', id, true FROM public.roles WHERE name='admin'
UNION ALL
SELECT 'configuracoes', 'update', id, true FROM public.roles WHERE name='admin'
ON CONFLICT (module, action, role_id) DO NOTHING;

-- 7. Funções auxiliares para RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, module_name TEXT, action_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.users u
    JOIN public.permissions p ON p.role_id = u.role_id
    WHERE u.id = user_id
      AND p.module = module_name
      AND p.action = action_name
      AND p.allowed = true
  );
$$;

-- 8. Trigger para atualizar updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Enable RLS nas tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies para users
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Supervisors can view their team"
ON public.users FOR SELECT
USING (
  supervisor_id = auth.uid()
  OR id = auth.uid()
);

CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Admins can insert users"
ON public.users FOR INSERT
WITH CHECK (
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Admins can update users"
ON public.users FOR UPDATE
USING (
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (id = auth.uid());

-- 11. RLS Policies para roles (somente leitura para todos autenticados)
CREATE POLICY "Authenticated users can view roles"
ON public.roles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 12. RLS Policies para permissions
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage permissions"
ON public.permissions FOR ALL
USING (public.get_user_role(auth.uid()) = 'admin');