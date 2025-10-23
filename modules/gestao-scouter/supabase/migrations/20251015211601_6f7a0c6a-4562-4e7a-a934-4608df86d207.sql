-- ============================================
-- SCHEMA COMPLETO UNIFICADO
-- TabuladorMax + Gestão Scouter em 1 Supabase
-- ============================================

-- 1. CRIAR ENUM PARA ROLES
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'scouter', 'telemarketing', 'gestor_telemarketing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. TABELAS DE AUTENTICAÇÃO E PERMISSÕES
-- ============================================

-- Tabela de Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  project TEXT -- 'scouter', 'telemarketing', 'both'
);

-- Tabela user_roles (evita escalação de privilégios)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  project TEXT NOT NULL, -- 'scouter', 'telemarketing', 'both'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role, project)
);

-- Tabela de Profiles (COMPARTILHADA)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  project TEXT NOT NULL, -- 'scouter', 'telemarketing', 'both'
  scouter_id INTEGER, -- apenas para scouters
  supervisor_id UUID, -- apenas para scouters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Permissões (COMPARTILHADA)
CREATE TABLE IF NOT EXISTS public.permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT FALSE,
  UNIQUE (role_id, module, action)
);

-- ============================================
-- 3. TABELA COMPARTILHADA DE FICHAS/LEADS
-- ============================================

CREATE TABLE IF NOT EXISTS public.fichas (
  id SERIAL PRIMARY KEY,
  
  -- Dados básicos (preenchidos pelo Scouter)
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  idade TEXT,
  
  -- Dados do projeto e origem
  projeto TEXT,
  scouter TEXT, -- nome do scouter
  scouter_user_id UUID REFERENCES auth.users(id),
  supervisor TEXT,
  
  -- Dados de localização
  localizacao TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  local_da_abordagem TEXT,
  
  -- Dados do lead
  modelo TEXT,
  etapa TEXT,
  
  -- Status da ficha (preenchido pelo Scouter)
  ficha_confirmada TEXT DEFAULT 'Aguardando',
  foto TEXT,
  cadastro_existe_foto TEXT,
  presenca_confirmada TEXT,
  
  -- Dados financeiros
  valor_ficha NUMERIC,
  
  -- Dados de tabulação (preenchidos pelo Telemarketing)
  tabulacao TEXT,
  agendado TEXT,
  data_agendamento TIMESTAMPTZ,
  compareceu TEXT,
  confirmado TEXT,
  resultado_ligacao TEXT,
  observacoes_telemarketing TEXT,
  telemarketing_user_id UUID REFERENCES auth.users(id),
  
  -- Integração Bitrix
  bitrix_id TEXT UNIQUE,
  bitrix_status TEXT,
  bitrix_synced_at TIMESTAMPTZ,
  
  -- Metadados
  criado TIMESTAMPTZ DEFAULT NOW(),
  hora_criacao_ficha TIME,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE,
  
  -- Dados brutos (backup)
  raw JSONB
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fichas_scouter ON fichas(scouter);
CREATE INDEX IF NOT EXISTS idx_fichas_projeto ON fichas(projeto);
CREATE INDEX IF NOT EXISTS idx_fichas_tabulacao ON fichas(tabulacao);
CREATE INDEX IF NOT EXISTS idx_fichas_criado ON fichas(criado);
CREATE INDEX IF NOT EXISTS idx_fichas_bitrix_id ON fichas(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_fichas_telemarketing_user ON fichas(telemarketing_user_id);
CREATE INDEX IF NOT EXISTS idx_fichas_scouter_user ON fichas(scouter_user_id);

-- ============================================
-- 4. TABELAS ESPECÍFICAS - GESTÃO SCOUTER
-- ============================================

-- Dados dos scouters
CREATE TABLE IF NOT EXISTS public.scouter_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT,
  supervisor TEXT,
  supervisor_user_id UUID REFERENCES auth.users(id),
  ativo BOOLEAN DEFAULT TRUE,
  data_admissao DATE,
  cpf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Localizações dos scouters (GPS tracking)
CREATE TABLE IF NOT EXISTS public.scouter_locations (
  id SERIAL PRIMARY KEY,
  scouter_id INTEGER REFERENCES scouter_profiles(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  battery_level INTEGER,
  is_moving BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_scouter_locations_timestamp ON scouter_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_scouter_locations_scouter ON scouter_locations(scouter_id);

-- Pagamentos de ajuda de custo
CREATE TABLE IF NOT EXISTS public.scouter_payments (
  id SERIAL PRIMARY KEY,
  scouter_id INTEGER REFERENCES scouter_profiles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  valor_base NUMERIC NOT NULL,
  bonus NUMERIC DEFAULT 0,
  descontos NUMERIC DEFAULT 0,
  valor_total NUMERIC NOT NULL,
  status TEXT DEFAULT 'Pendente',
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Métricas de performance dos scouters
CREATE TABLE IF NOT EXISTS public.scouter_metrics (
  id SERIAL PRIMARY KEY,
  scouter_id INTEGER REFERENCES scouter_profiles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  total_fichas INTEGER DEFAULT 0,
  fichas_confirmadas INTEGER DEFAULT 0,
  fichas_com_foto INTEGER DEFAULT 0,
  taxa_conversao NUMERIC,
  iqs NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (scouter_id, periodo)
);

-- ============================================
-- 5. TABELAS ESPECÍFICAS - TABULADORMAX
-- ============================================

-- Operadores de telemarketing
CREATE TABLE IF NOT EXISTS public.telemarketing_agents (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT,
  supervisor TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  data_admissao DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de ligações
CREATE TABLE IF NOT EXISTS public.call_logs (
  id SERIAL PRIMARY KEY,
  ficha_id INTEGER REFERENCES fichas(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES telemarketing_agents(id),
  phone_called TEXT NOT NULL,
  call_status TEXT NOT NULL,
  call_duration INTEGER,
  call_recording_url TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_ficha ON call_logs(ficha_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp ON call_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent ON call_logs(agent_id);

-- Métricas de telemarketing
CREATE TABLE IF NOT EXISTS public.telemarketing_metrics (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES telemarketing_agents(id),
  periodo TEXT NOT NULL,
  total_ligacoes INTEGER DEFAULT 0,
  ligacoes_atendidas INTEGER DEFAULT 0,
  conversoes INTEGER DEFAULT 0,
  taxa_conversao NUMERIC,
  tempo_medio_ligacao INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, periodo)
);

-- ============================================
-- 6. TABELA DE LOGS (COMPARTILHADA)
-- ============================================

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id SERIAL PRIMARY KEY,
  payload JSONB,
  source TEXT,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);

-- ============================================
-- 7. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouter_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouter_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouter_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemarketing_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemarketing_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- ============================================

-- Função para verificar roles (evita recursão RLS)
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
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar acesso ao projeto
CREATE OR REPLACE FUNCTION public.user_has_project_access(_user_id UUID, _project TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id 
    AND (project = _project OR project = 'both')
  )
$$;

-- ============================================
-- 9. POLÍTICAS RLS
-- ============================================

-- POLICIES PARA PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES PARA ROLES (somente leitura para usuários autenticados)
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

-- POLICIES PARA USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES PARA PERMISSIONS (somente leitura)
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES PARA FICHAS (TABELA COMPARTILHADA)
DROP POLICY IF EXISTS "Admins can view all fichas" ON public.fichas;
CREATE POLICY "Admins can view all fichas" ON public.fichas
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Supervisors can view team fichas" ON public.fichas;
CREATE POLICY "Supervisors can view team fichas" ON public.fichas
  FOR SELECT USING (
    public.has_role(auth.uid(), 'supervisor') AND
    supervisor = (SELECT name FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Scouters can view own fichas" ON public.fichas;
CREATE POLICY "Scouters can view own fichas" ON public.fichas
  FOR SELECT USING (
    public.has_role(auth.uid(), 'scouter') AND
    scouter_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Telemarketing can view all fichas" ON public.fichas;
CREATE POLICY "Telemarketing can view all fichas" ON public.fichas
  FOR SELECT USING (
    public.has_role(auth.uid(), 'telemarketing') OR
    public.has_role(auth.uid(), 'gestor_telemarketing')
  );

DROP POLICY IF EXISTS "Scouters can insert fichas" ON public.fichas;
CREATE POLICY "Scouters can insert fichas" ON public.fichas
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'scouter') AND
    scouter_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Telemarketing can update tabulacao" ON public.fichas;
CREATE POLICY "Telemarketing can update tabulacao" ON public.fichas
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'telemarketing') OR
    public.has_role(auth.uid(), 'gestor_telemarketing')
  );

DROP POLICY IF EXISTS "Admins can update fichas" ON public.fichas;
CREATE POLICY "Admins can update fichas" ON public.fichas
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES PARA SCOUTER_PROFILES
DROP POLICY IF EXISTS "Scouter users can view own profile" ON public.scouter_profiles;
CREATE POLICY "Scouter users can view own profile" ON public.scouter_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Supervisors can view team profiles" ON public.scouter_profiles;
CREATE POLICY "Supervisors can view team profiles" ON public.scouter_profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'supervisor') AND
    supervisor_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can view all scouter profiles" ON public.scouter_profiles;
CREATE POLICY "Admins can view all scouter profiles" ON public.scouter_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage scouter profiles" ON public.scouter_profiles;
CREATE POLICY "Admins can manage scouter profiles" ON public.scouter_profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES PARA SCOUTER_LOCATIONS
DROP POLICY IF EXISTS "Scouters can view own locations" ON public.scouter_locations;
CREATE POLICY "Scouters can view own locations" ON public.scouter_locations
  FOR SELECT USING (
    scouter_id = (SELECT id FROM scouter_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all locations" ON public.scouter_locations;
CREATE POLICY "Admins can view all locations" ON public.scouter_locations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Scouters can insert own locations" ON public.scouter_locations;
CREATE POLICY "Scouters can insert own locations" ON public.scouter_locations
  FOR INSERT WITH CHECK (
    scouter_id = (SELECT id FROM scouter_profiles WHERE user_id = auth.uid())
  );

-- POLICIES PARA SCOUTER_PAYMENTS
DROP POLICY IF EXISTS "Scouters can view own payments" ON public.scouter_payments;
CREATE POLICY "Scouters can view own payments" ON public.scouter_payments
  FOR SELECT USING (
    scouter_id = (SELECT id FROM scouter_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.scouter_payments;
CREATE POLICY "Admins can manage all payments" ON public.scouter_payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES PARA TELEMARKETING_AGENTS
DROP POLICY IF EXISTS "Telemarketing users can view own profile" ON public.telemarketing_agents;
CREATE POLICY "Telemarketing users can view own profile" ON public.telemarketing_agents
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Gestores can view all agents" ON public.telemarketing_agents;
CREATE POLICY "Gestores can view all agents" ON public.telemarketing_agents
  FOR SELECT USING (public.has_role(auth.uid(), 'gestor_telemarketing'));

DROP POLICY IF EXISTS "Admins can view all agents" ON public.telemarketing_agents;
CREATE POLICY "Admins can view all agents" ON public.telemarketing_agents
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage agents" ON public.telemarketing_agents;
CREATE POLICY "Admins can manage agents" ON public.telemarketing_agents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- POLICIES PARA CALL_LOGS
DROP POLICY IF EXISTS "Telemarketing can view own calls" ON public.call_logs;
CREATE POLICY "Telemarketing can view own calls" ON public.call_logs
  FOR SELECT USING (
    agent_id = (SELECT id FROM telemarketing_agents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Gestores can view all calls" ON public.call_logs;
CREATE POLICY "Gestores can view all calls" ON public.call_logs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gestor_telemarketing') OR
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Telemarketing can insert calls" ON public.call_logs;
CREATE POLICY "Telemarketing can insert calls" ON public.call_logs
  FOR INSERT WITH CHECK (
    agent_id = (SELECT id FROM telemarketing_agents WHERE user_id = auth.uid())
  );

-- ============================================
-- 10. TRIGGERS AUTOMÁTICOS
-- ============================================

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, project)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'project', 'scouter')
  );
  
  -- Atribuir role padrão baseado no projeto
  IF (NEW.raw_user_meta_data->>'project' = 'telemarketing') THEN
    INSERT INTO public.user_roles (user_id, role, project)
    VALUES (NEW.id, 'telemarketing', 'telemarketing');
  ELSE
    INSERT INTO public.user_roles (user_id, role, project)
    VALUES (NEW.id, 'scouter', 'scouter');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fichas_updated_at ON public.fichas;
CREATE TRIGGER fichas_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 11. VIEWS PARA RELATÓRIOS
-- ============================================

-- View completa de fichas com dados integrados
CREATE OR REPLACE VIEW public.fichas_completas AS
SELECT 
  f.*,
  sp.nome as scouter_nome_completo,
  sp.telefone as scouter_telefone,
  ta.nome as telemarketing_nome,
  COUNT(cl.id) as total_ligacoes,
  MAX(cl.timestamp) as ultima_ligacao
FROM public.fichas f
LEFT JOIN public.scouter_profiles sp ON f.scouter_user_id = sp.user_id
LEFT JOIN public.telemarketing_agents ta ON f.telemarketing_user_id = ta.user_id
LEFT JOIN public.call_logs cl ON f.id = cl.ficha_id
GROUP BY f.id, sp.id, ta.id;

-- View de métricas gerais
CREATE OR REPLACE VIEW public.metricas_gerais AS
SELECT
  DATE(f.criado) as data,
  f.projeto,
  COUNT(*) as total_fichas,
  COUNT(CASE WHEN f.ficha_confirmada = 'Confirmada' THEN 1 END) as fichas_confirmadas,
  COUNT(CASE WHEN f.tabulacao IS NOT NULL THEN 1 END) as fichas_tabuladas,
  COUNT(CASE WHEN f.compareceu = '1' THEN 1 END) as comparecimentos,
  AVG(CASE WHEN f.valor_ficha IS NOT NULL THEN f.valor_ficha END) as valor_medio_ficha
FROM public.fichas f
WHERE f.deleted = false
GROUP BY DATE(f.criado), f.projeto
ORDER BY data DESC;

-- ============================================
-- 12. SEED DE DADOS INICIAL
-- ============================================

-- Inserir roles padrão
INSERT INTO public.roles (id, name, description, project) VALUES
  (1, 'admin', 'Administrador com acesso total', 'both'),
  (2, 'supervisor', 'Supervisor de scouters', 'scouter'),
  (3, 'scouter', 'Scouter de campo', 'scouter'),
  (4, 'gestor_telemarketing', 'Gestor de telemarketing', 'telemarketing'),
  (5, 'telemarketing', 'Operador de telemarketing', 'telemarketing')
ON CONFLICT (id) DO NOTHING;

-- Inserir permissões padrão
INSERT INTO public.permissions (role_id, module, action, allowed) VALUES
  -- Admin: acesso total
  (1, 'fichas', 'view', true),
  (1, 'fichas', 'create', true),
  (1, 'fichas', 'edit', true),
  (1, 'fichas', 'delete', true),
  (1, 'dashboard', 'view', true),
  (1, 'scouters', 'view', true),
  (1, 'scouters', 'manage', true),
  (1, 'pagamentos', 'view', true),
  (1, 'pagamentos', 'create', true),
  (1, 'configuracoes', 'view', true),
  
  -- Supervisor: acesso gerencial
  (2, 'fichas', 'view', true),
  (2, 'dashboard', 'view', true),
  (2, 'scouters', 'view', true),
  (2, 'pagamentos', 'view', true),
  
  -- Scouter: acesso básico
  (3, 'fichas', 'view', true),
  (3, 'fichas', 'create', true),
  (3, 'dashboard', 'view', true),
  
  -- Gestor Telemarketing
  (4, 'fichas', 'view', true),
  (4, 'tabulacao', 'view', true),
  (4, 'tabulacao', 'edit', true),
  (4, 'dashboard', 'view', true),
  (4, 'relatorios', 'view', true),
  (4, 'agents', 'manage', true),
  
  -- Operador Telemarketing
  (5, 'fichas', 'view', true),
  (5, 'tabulacao', 'edit', true),
  (5, 'dashboard', 'view', true)
ON CONFLICT DO NOTHING;