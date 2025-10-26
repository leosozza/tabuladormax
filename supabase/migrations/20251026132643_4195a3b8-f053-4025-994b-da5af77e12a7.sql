-- Criar tabela de rotas da aplicação
CREATE TABLE IF NOT EXISTS public.app_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de permissões de rotas
CREATE TABLE IF NOT EXISTS public.route_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.app_routes(id) ON DELETE CASCADE,
  department app_department NOT NULL,
  role app_role NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(route_id, department, role)
);

-- Habilitar RLS
ALTER TABLE public.app_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- Policies para app_routes
CREATE POLICY "Todos podem ver rotas ativas"
  ON public.app_routes FOR SELECT
  USING (active = true);

CREATE POLICY "Admins podem gerenciar rotas"
  ON public.app_routes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies para route_permissions
CREATE POLICY "Todos podem ver permissões"
  ON public.route_permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar permissões"
  ON public.route_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Função para verificar acesso a rota
CREATE OR REPLACE FUNCTION public.can_access_route(
  _user_id UUID,
  _route_path TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_dept app_department;
  route_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Buscar role do usuário
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  -- Buscar departamento do usuário
  SELECT department INTO user_dept
  FROM user_departments
  WHERE user_id = _user_id
  LIMIT 1;

  -- Se não encontrou role ou dept, negar acesso
  IF user_role IS NULL OR user_dept IS NULL THEN
    RETURN false;
  END IF;

  -- Buscar ID da rota
  SELECT id INTO route_id
  FROM app_routes
  WHERE path = _route_path AND active = true
  LIMIT 1;

  -- Se rota não existe ou não está ativa, permitir (backward compatibility)
  IF route_id IS NULL THEN
    RETURN true;
  END IF;

  -- Verificar permissão
  SELECT can_access INTO has_permission
  FROM route_permissions
  WHERE route_permissions.route_id = can_access_route.route_id
    AND department = user_dept
    AND role = user_role
  LIMIT 1;

  -- Se não encontrou permissão configurada, negar acesso
  RETURN COALESCE(has_permission, false);
END;
$$;

-- Inserir rotas iniciais
INSERT INTO public.app_routes (path, name, description, module) VALUES
  -- Admin
  ('/admin', 'Admin Hub', 'Central administrativa', 'admin'),
  ('/admin/users', 'Usuários', 'Gerenciar usuários', 'admin'),
  ('/admin/permissions', 'Permissões', 'Gerenciar permissões', 'admin'),
  ('/admin/config', 'Configurações', 'Configurações do sistema', 'admin'),
  ('/admin/diagnostics', 'Diagnósticos', 'Diagnósticos do sistema', 'admin'),
  ('/admin/logs', 'Logs', 'Logs do sistema', 'admin'),
  ('/admin/sync-monitor', 'Monitor de Sync', 'Monitor de sincronização', 'admin'),
  ('/admin/performance-monitoring', 'Monitoramento', 'Monitoramento de performance', 'admin'),
  ('/admin/unified-dashboard', 'Dashboard Unificado', 'Dashboard administrativo', 'admin'),
  ('/admin/agent-mapping', 'Mapeamento de Agentes', 'Mapear agentes Chatwoot/Bitrix', 'admin'),
  
  -- Tabulador
  ('/lead', 'Tabulação', 'Tabulação de leads', 'tabulador'),
  ('/dashboard', 'Dashboard', 'Dashboard de análise', 'tabulador'),
  ('/dashboard-manager', 'Gerenciar Dashboard', 'Gerenciar widgets do dashboard', 'tabulador'),
  
  -- Gestão Scouter
  ('/gestao/home', 'Home Gestão', 'Página inicial Gestão Scouter', 'gestao'),
  ('/gestao/leads', 'Leads Gestão', 'Gerenciar leads Gestão Scouter', 'gestao'),
  ('/gestao/dashboard-avancado', 'Dashboard Avançado', 'Dashboard avançado Gestão', 'gestao'),
  ('/gestao/analise-leads', 'Análise de Leads', 'Análise detalhada de leads', 'gestao'),
  ('/gestao/area-abordagem', 'Área de Abordagem', 'Mapa de áreas de abordagem', 'gestao'),
  ('/gestao/scouters', 'Scouters', 'Gerenciar scouters', 'gestao'),
  ('/gestao/relatorios', 'Relatórios', 'Relatórios Gestão Scouter', 'gestao'),
  ('/gestao/pagamentos', 'Pagamentos', 'Gerenciar pagamentos', 'gestao'),
  ('/gestao/projecao', 'Projeção', 'Projeção de resultados', 'gestao')
ON CONFLICT (path) DO NOTHING;

-- Inserir permissões padrão (todos os departamentos e roles com acesso negado inicialmente)
INSERT INTO public.route_permissions (route_id, department, role, can_access)
SELECT 
  r.id,
  d.department,
  ro.role,
  CASE 
    -- Admin tem acesso a tudo
    WHEN ro.role = 'admin' THEN true
    -- Manager tem acesso ao tabulador e gestão
    WHEN ro.role = 'manager' AND r.module IN ('tabulador', 'gestao') THEN true
    -- Supervisor tem acesso ao tabulador
    WHEN ro.role = 'supervisor' AND r.module = 'tabulador' THEN true
    -- Agents têm acesso básico ao tabulador
    WHEN ro.role = 'agent' AND r.path = '/lead' THEN true
    ELSE false
  END as can_access
FROM public.app_routes r
CROSS JOIN (
  SELECT UNNEST(ENUM_RANGE(NULL::app_department)) as department
) d
CROSS JOIN (
  SELECT UNNEST(ENUM_RANGE(NULL::app_role)) as role
) ro
ON CONFLICT (route_id, department, role) DO NOTHING;