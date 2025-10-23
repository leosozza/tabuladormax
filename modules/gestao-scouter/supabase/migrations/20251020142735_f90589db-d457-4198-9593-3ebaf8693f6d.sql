-- =============================================
-- MIGRAÇÃO COMPLETA - GESTÃO SCOUTER
-- =============================================

-- 1. CREATE ENUM FOR ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'scouter', 'gestor_telemarketing', 'telemarketing');

-- 2. ROLES TABLE
CREATE TABLE public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USERS TABLE
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id INTEGER NOT NULL REFERENCES public.roles(id),
  scouter_id BIGINT,
  supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER_ROLES TABLE (for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 5. SCOUTER_PROFILES TABLE
CREATE TABLE public.scouter_profiles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  supervisor_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LEADS TABLE (principal)
CREATE TABLE public.leads (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT,
  age INTEGER,
  telefone TEXT,
  email TEXT,
  scouter TEXT,
  scouter_id BIGINT REFERENCES public.scouter_profiles(id),
  commercial_project_id TEXT,
  criado TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  valor_ficha DECIMAL(10,2),
  aprovado BOOLEAN,
  deleted BOOLEAN DEFAULT FALSE,
  etapa TEXT,
  local_abordagem TEXT,
  ficha_confirmada TEXT,
  presenca_confirmada BOOLEAN,
  compareceu BOOLEAN,
  supervisor TEXT,
  sync_source TEXT,
  sync_status TEXT,
  last_sync_at TIMESTAMPTZ,
  analisado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  analisado_em TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  localizacao TEXT,
  foto TEXT,
  projeto TEXT,
  local_da_abordagem TEXT,
  raw JSONB
);

-- 7. PERMISSIONS TABLE
CREATE TABLE public.permissions (
  id SERIAL PRIMARY KEY,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (module, action, role_id)
);

-- 8. SYNC CONFIGURATION TABLES
CREATE TABLE public.tabulador_config (
  project_id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  publishable_key TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('idle','running','error','ok')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sync_logs_detailed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT,
  table_name TEXT,
  status TEXT,
  records_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  request_params JSONB,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT,
  table_name TEXT,
  status TEXT,
  records_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  request_params JSONB,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DASHBOARD TABLES
CREATE TABLE public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.dashboard_indicator_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_users_role_id ON public.users(role_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_leads_scouter_id ON public.leads(scouter_id);
CREATE INDEX idx_leads_created_at ON public.leads(criado);
CREATE INDEX idx_leads_commercial_project ON public.leads(commercial_project_id);
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs_detailed(created_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_logs_detailed(status);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabulador_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_indicator_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouter_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role from users table
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = _user_id
$$;

-- List users (admin only)
CREATE OR REPLACE FUNCTION public.list_users_admin()
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  role_id INTEGER,
  role TEXT,
  scouter_id BIGINT,
  supervisor_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.name, u.email, u.role_id, r.name AS role, 
         u.scouter_id, u.supervisor_id, u.created_at
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  ORDER BY u.created_at DESC;
$$;

-- Update user role
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_role_id INTEGER,
  p_scouter_id BIGINT DEFAULT NULL,
  p_supervisor_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.users
  SET role_id = p_role_id,
      scouter_id = p_scouter_id,
      supervisor_id = p_supervisor_id,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- List permissions
CREATE OR REPLACE FUNCTION public.list_permissions()
RETURNS TABLE(id INT, module TEXT, action TEXT, role_id INT, role TEXT, allowed BOOLEAN)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.module, p.action, p.role_id, r.name AS role, p.allowed
  FROM public.permissions p
  JOIN public.roles r ON r.id = p.role_id
  ORDER BY module, role, action;
$$;

-- Set permission
CREATE OR REPLACE FUNCTION public.set_permission(
  p_module TEXT,
  p_action TEXT,
  p_role_id INTEGER,
  p_allowed BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  INSERT INTO public.permissions(module, action, role_id, allowed)
  VALUES (p_module, p_action, p_role_id, p_allowed)
  ON CONFLICT (module, action, role_id) 
  DO UPDATE SET allowed = EXCLUDED.allowed;
END;
$$;

-- Set lead analysis
CREATE OR REPLACE FUNCTION public.set_lead_analysis(
  p_lead_id BIGINT,
  p_aprovado BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
  SET aprovado = p_aprovado,
      analisado_por = auth.uid(),
      analisado_em = NOW()
  WHERE id = p_lead_id;
END;
$$;

-- List public tables
CREATE OR REPLACE FUNCTION public.list_public_tables()
RETURNS TABLE(table_name TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tablename::TEXT 
  FROM pg_catalog.pg_tables 
  WHERE schemaname = 'public'
  ORDER BY tablename;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Users: Can view own profile
CREATE POLICY users_self_read ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

-- Users: Admins can do everything
CREATE POLICY users_admin_all ON public.users
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- User Roles: Admins can manage
CREATE POLICY user_roles_admin_all ON public.user_roles
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Leads: Admins can do everything
CREATE POLICY leads_admin_all ON public.leads
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Leads: Users can view all (for now, adjust based on requirements)
CREATE POLICY leads_authenticated_read ON public.leads
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Scouter Profiles: Authenticated can read
CREATE POLICY scouter_profiles_read ON public.scouter_profiles
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Scouter Profiles: Admins can manage
CREATE POLICY scouter_profiles_admin_all ON public.scouter_profiles
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Permissions: Authenticated can read
CREATE POLICY permissions_read ON public.permissions
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Sync tables: Authenticated can read
CREATE POLICY tabulador_config_read ON public.tabulador_config
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY sync_status_read ON public.sync_status
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY sync_logs_detailed_read ON public.sync_logs_detailed
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY sync_logs_read ON public.sync_logs
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Dashboard: Users own their configs
CREATE POLICY dashboard_configs_owner ON public.dashboard_configs
  FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY dashboard_indicator_configs_owner ON public.dashboard_indicator_configs
  FOR ALL 
  USING (auth.uid() = user_id);

-- =============================================
-- SEED DATA
-- =============================================

-- Insert roles
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Acesso total ao sistema'),
  ('supervisor', 'Acesso à equipe'),
  ('scouter', 'Acesso aos próprios registros'),
  ('gestor_telemarketing', 'Gestor de telemarketing'),
  ('telemarketing', 'Operador de telemarketing');

-- Insert default permissions
INSERT INTO public.permissions (module, action, role_id, allowed)
SELECT m.module, a.action, r.id, true
FROM (VALUES ('leads'), ('dashboard'), ('mapa'), ('projecao'), ('configuracoes')) AS m(module)
CROSS JOIN (VALUES ('read'), ('create'), ('update'), ('delete')) AS a(action)
CROSS JOIN public.roles r
WHERE r.name = 'admin';

-- Insert read permissions for other roles
INSERT INTO public.permissions (module, action, role_id, allowed)
SELECT m.module, a.action, r.id, true
FROM (VALUES ('leads'), ('dashboard'), ('mapa')) AS m(module)
CROSS JOIN (VALUES ('read')) AS a(action)
CROSS JOIN public.roles r
WHERE r.name IN ('supervisor', 'scouter');

-- Insert test leads
INSERT INTO public.leads (nome, age, telefone, scouter, commercial_project_id, valor_ficha, criado)
VALUES
  ('João Silva', 25, '11987654321', 'Scouter 1', 'PROJ001', 150.00, NOW() - INTERVAL '5 days'),
  ('Maria Santos', 30, '11987654322', 'Scouter 1', 'PROJ001', 150.00, NOW() - INTERVAL '4 days'),
  ('Pedro Costa', 28, '11987654323', 'Scouter 2', 'PROJ002', 200.00, NOW() - INTERVAL '3 days'),
  ('Ana Paula', 22, '11987654324', 'Scouter 2', 'PROJ002', 200.00, NOW() - INTERVAL '2 days'),
  ('Carlos Souza', 35, '11987654325', 'Scouter 3', 'PROJ001', 150.00, NOW() - INTERVAL '1 day'),
  ('Juliana Lima', 27, '11987654326', 'Scouter 3', 'PROJ003', 180.00, NOW()),
  ('Roberto Alves', 32, '11987654327', 'Scouter 1', 'PROJ003', 180.00, NOW() - INTERVAL '6 days'),
  ('Fernanda Rocha', 24, '11987654328', 'Scouter 2', 'PROJ001', 150.00, NOW() - INTERVAL '7 days'),
  ('Lucas Martins', 29, '11987654329', 'Scouter 3', 'PROJ002', 200.00, NOW() - INTERVAL '8 days'),
  ('Patricia Dias', 26, '11987654330', 'Scouter 1', 'PROJ003', 180.00, NOW() - INTERVAL '9 days');