-- Criar ENUM para permission_scope
CREATE TYPE permission_scope AS ENUM ('global', 'department', 'own');

-- Criar tabela commercial_projects
CREATE TABLE commercial_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  commercial_project_id UUID NOT NULL REFERENCES commercial_projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(commercial_project_id, code)
);

-- Criar tabela permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  scope permission_scope NOT NULL DEFAULT 'own',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource, action)
);

-- Criar tabela role_permissions
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  scope permission_scope NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Adicionar campos em agent_telemarketing_mapping
ALTER TABLE agent_telemarketing_mapping
ADD COLUMN IF NOT EXISTS commercial_project_id UUID REFERENCES commercial_projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índices
CREATE INDEX idx_departments_project ON departments(commercial_project_id);
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_agent_mapping_project ON agent_telemarketing_mapping(commercial_project_id);
CREATE INDEX idx_agent_mapping_department ON agent_telemarketing_mapping(department_id);
CREATE INDEX idx_agent_mapping_supervisor ON agent_telemarketing_mapping(supervisor_id);

-- Habilitar RLS
ALTER TABLE commercial_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para commercial_projects
CREATE POLICY "Users can view active projects"
ON commercial_projects FOR SELECT
TO authenticated
USING (active = true);

CREATE POLICY "Admins and managers can manage projects"
ON commercial_projects FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies para departments
CREATE POLICY "Users can view active departments"
ON departments FOR SELECT
TO authenticated
USING (active = true);

CREATE POLICY "Admins and managers can manage departments"
ON departments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies para permissions
CREATE POLICY "Users can view permissions"
ON permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions"
ON permissions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies para role_permissions
CREATE POLICY "Users can view role permissions"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage role permissions"
ON role_permissions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Inserir permissões padrão
INSERT INTO permissions (name, resource, action, label, description, scope) VALUES
('leads.view', 'leads', 'view', 'Visualizar Leads', 'Permite visualizar leads', 'own'),
('leads.edit', 'leads', 'edit', 'Editar Leads', 'Permite editar leads', 'own'),
('leads.delete', 'leads', 'delete', 'Excluir Leads', 'Permite excluir leads', 'own'),
('leads.create', 'leads', 'create', 'Criar Leads', 'Permite criar novos leads', 'department'),
('users.manage', 'users', 'manage', 'Gerenciar Usuários', 'Permite gerenciar usuários do sistema', 'global'),
('departments.manage', 'departments', 'manage', 'Gerenciar Departamentos', 'Permite gerenciar departamentos', 'global'),
('permissions.manage', 'permissions', 'manage', 'Gerenciar Permissões', 'Permite gerenciar permissões e papéis', 'global'),
('mappings.view', 'mappings', 'view', 'Visualizar Mapeamentos', 'Permite visualizar mapeamentos de agentes', 'department'),
('mappings.manage', 'mappings', 'manage', 'Gerenciar Mapeamentos', 'Permite gerenciar mapeamentos de agentes', 'department'),
('sync.monitor', 'sync', 'monitor', 'Monitorar Sincronização', 'Permite monitorar logs de sincronização', 'global'),
('config.manage', 'config', 'manage', 'Gerenciar Configurações', 'Permite gerenciar configurações do sistema', 'global')
ON CONFLICT (name) DO NOTHING;

-- Configurar role_permissions padrão
-- Admin tem acesso global a tudo
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'admin', id, 'global' FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Manager tem acesso por departamento
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'manager', id, 'department' FROM permissions WHERE resource IN ('leads', 'mappings', 'departments', 'users')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'manager', id, 'global' FROM permissions WHERE resource IN ('sync', 'config')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Supervisor tem acesso por departamento (leads e mappings)
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'supervisor', id, 'department' FROM permissions WHERE resource IN ('leads', 'mappings')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Agent tem acesso apenas aos próprios leads
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'agent', id, 'own' FROM permissions WHERE resource = 'leads' AND action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Adicionar triggers de updated_at
CREATE TRIGGER update_commercial_projects_updated_at
  BEFORE UPDATE ON commercial_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();