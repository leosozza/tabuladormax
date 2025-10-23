-- ============================================================================
-- SCRIPT COMPLETO: Schema do Supabase - Gestão Scouter
-- ============================================================================
-- Arquivo: docs/gestao-scouter-fichas-table.sql
-- Data: 2025-10-18
-- Descrição: Script completo para criar/restaurar o schema do banco de dados
--            do projeto Gestão Scouter, incluindo:
--            - Tabela fichas completa (36+ colunas)
--            - Tabelas auxiliares (sync_queue, sync_logs, sync_status)
--            - Tabelas de autenticação (users via auth.users, roles, permissions)
--            - Políticas RLS (Row Level Security)
--            - Triggers automáticos
--            - Índices de performance
--
-- Objetivo: Restabelecer sincronização e exibição de leads
--
-- Como usar:
--   1. Via Supabase Dashboard: SQL Editor → New Query → Colar conteúdo → Run
--   2. Via Supabase CLI: supabase db reset (aplica todas migrations)
--   3. Via psql: psql -h <host> -U <user> -d <database> -f docs/gestao-scouter-fichas-table.sql
--
-- ⚠️ ATENÇÃO: Este script é idempotente (pode ser executado múltiplas vezes)
-- ============================================================================

-- ============================================================================
-- PARTE 1: EXTENSÕES E ENUMS
-- ============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA public;

-- Criar enum para roles (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin', 
      'supervisor', 
      'scouter', 
      'telemarketing', 
      'gestor_telemarketing'
    );
  END IF;
END $$;

COMMENT ON TYPE public.app_role IS 'Roles de usuários do sistema (Gestão Scouter + TabuladorMax)';

-- ============================================================================
-- PARTE 2: TABELA FICHAS COMPLETA (36+ COLUNAS)
-- ============================================================================

-- Criar tabela fichas com todas as colunas necessárias
CREATE TABLE IF NOT EXISTS public.fichas (
  -- ===== IDENTIFICAÇÃO E CHAVE PRIMÁRIA =====
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- ===== DADOS BRUTOS E METADATA CORE =====
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ===== DADOS BÁSICOS DO LEAD =====
  nome TEXT,
  name TEXT, -- Alias para compatibilidade
  telefone TEXT,
  celular TEXT,
  telefone_trabalho TEXT,
  telefone_casa TEXT,
  email TEXT,
  idade TEXT,
  age INTEGER,
  address TEXT,
  photo_url TEXT,
  
  -- ===== PROJETO E ORIGEM =====
  projeto TEXT,
  scouter TEXT,
  responsible TEXT, -- Responsável pelo lead
  supervisor TEXT,
  fonte TEXT, -- Fonte/origem do lead
  nome_modelo TEXT, -- Nome do modelo utilizado
  modelo TEXT,
  
  -- ===== LOCALIZAÇÃO =====
  localizacao TEXT,
  lat DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  local_abordagem TEXT,
  local_da_abordagem TEXT,
  
  -- ===== VALORES E FINANÇAS =====
  valor_ficha NUMERIC(12,2),
  
  -- ===== ETAPAS E STATUS =====
  etapa TEXT,
  etapa_funil TEXT, -- Etapa atual no funil de vendas
  etapa_fluxo TEXT, -- Etapa atual no fluxo de trabalho
  status_fluxo TEXT, -- Status atual no fluxo de trabalho
  status_tabulacao TEXT, -- Status da tabulação do lead
  gerenciamento_funil TEXT, -- Gerenciamento de funil de vendas
  funil_fichas TEXT, -- Funil específico de fichas
  
  -- ===== CONFIRMAÇÃO E VALIDAÇÃO =====
  ficha_confirmada BOOLEAN DEFAULT false,
  data_criacao_ficha TIMESTAMPTZ,
  data_confirmacao_ficha TIMESTAMPTZ,
  cadastro_existe_foto BOOLEAN DEFAULT false,
  foto TEXT,
  foto_1 TEXT,
  aprovado BOOLEAN DEFAULT NULL,
  
  -- ===== AGENDAMENTO E PRESENÇA =====
  presenca_confirmada BOOLEAN DEFAULT false,
  compareceu BOOLEAN DEFAULT false,
  agendado TEXT,
  confirmado TEXT,
  data_criacao_agendamento TIMESTAMPTZ,
  horario_agendamento TEXT,
  data_agendamento DATE,
  data_retorno_ligacao TIMESTAMPTZ,
  
  -- ===== TABULAÇÃO E TELEMARKETING =====
  tabulacao TEXT,
  resultado_ligacao TEXT,
  observacoes_telemarketing TEXT,
  op_telemarketing TEXT, -- Operador de telemarketing responsável
  
  -- ===== DATAS E TIMESTAMPS =====
  criado DATE, -- Data de criação (formato brasileiro)
  data DATE,
  hora_criacao_ficha TIME,
  date_modify TIMESTAMPTZ, -- Data da última modificação
  
  -- ===== INTEGRAÇÕES EXTERNAS =====
  bitrix_id TEXT UNIQUE,
  bitrix_status TEXT,
  bitrix_synced_at TIMESTAMPTZ,
  bitrix_telemarketing_id BIGINT, -- ID do telemarketing no Bitrix CRM
  maxsystem_id_ficha TEXT, -- ID da ficha no sistema MaxSystem
  gestao_scouter TEXT, -- Identificador do sistema Gestão Scouter
  
  -- ===== RELACIONAMENTOS (UUIDs) =====
  scouter_user_id UUID,
  telemarketing_user_id UUID,
  commercial_project_id UUID, -- ID do projeto comercial
  responsible_user_id UUID, -- ID do usuário responsável
  
  -- ===== SINCRONIZAÇÃO =====
  sync_source TEXT DEFAULT 'Gestao',
  last_synced_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ, -- Timestamp da última sincronização (TabuladorMax)
  sync_status TEXT -- Status da sincronização (pending, synced, error)
);

-- Comentários descritivos para cada grupo de colunas
COMMENT ON TABLE public.fichas IS 'Tabela centralizada de fichas/leads - FONTE ÚNICA DE VERDADE';
COMMENT ON COLUMN public.fichas.id IS 'Identificador único da ficha. Auto-gera UUID string para novos registros locais. Aceita IDs numéricos/texto de sincronização/importação.';
COMMENT ON COLUMN public.fichas.raw IS 'Linha completa como JSON para auditoria e backup';
COMMENT ON COLUMN public.fichas.deleted IS 'Soft delete flag - marcação lógica de exclusão';
COMMENT ON COLUMN public.fichas.created_at IS 'Timestamp de criação (padrão ISO)';
COMMENT ON COLUMN public.fichas.updated_at IS 'Timestamp de última modificação (atualizado automaticamente)';
COMMENT ON COLUMN public.fichas.criado IS 'Data de criação (formato brasileiro dd/MM/yyyy)';
COMMENT ON COLUMN public.fichas.sync_source IS 'Origem da última sincronização (Gestao, TabuladorMax, diagnostics)';
COMMENT ON COLUMN public.fichas.last_synced_at IS 'Timestamp da última sincronização bem-sucedida (Gestão Scouter)';
COMMENT ON COLUMN public.fichas.last_sync_at IS 'Timestamp da última sincronização (TabuladorMax)';

-- ============================================================================
-- PARTE 3: ÍNDICES DE PERFORMANCE
-- ============================================================================

-- Índices primários e únicos
CREATE UNIQUE INDEX IF NOT EXISTS fichas_pkey_unique ON public.fichas(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fichas_bitrix_id ON public.fichas(bitrix_id) WHERE bitrix_id IS NOT NULL;

-- Índices para identificação e busca
CREATE INDEX IF NOT EXISTS idx_fichas_nome ON public.fichas(nome) WHERE nome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_name ON public.fichas(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_telefone ON public.fichas(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_celular ON public.fichas(celular) WHERE celular IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_email ON public.fichas(email) WHERE email IS NOT NULL;

-- Índices para projeto e equipe
CREATE INDEX IF NOT EXISTS idx_fichas_projeto ON public.fichas(projeto) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_fichas_scouter ON public.fichas(scouter) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_fichas_responsible ON public.fichas(responsible) WHERE responsible IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_supervisor ON public.fichas(supervisor) WHERE supervisor IS NOT NULL;

-- Índices para datas
CREATE INDEX IF NOT EXISTS idx_fichas_criado ON public.fichas(criado);
CREATE INDEX IF NOT EXISTS idx_fichas_created_at ON public.fichas(created_at DESC) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_fichas_updated_at ON public.fichas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fichas_data_agendamento ON public.fichas(data_agendamento) WHERE data_agendamento IS NOT NULL;

-- Índices para localização
CREATE INDEX IF NOT EXISTS idx_fichas_lat_lng ON public.fichas(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_localizacao ON public.fichas(localizacao) WHERE localizacao IS NOT NULL;

-- Índices para status e funil
CREATE INDEX IF NOT EXISTS idx_fichas_etapa ON public.fichas(etapa) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_fichas_status_fluxo ON public.fichas(status_fluxo) WHERE status_fluxo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_etapa_funil ON public.fichas(etapa_funil) WHERE etapa_funil IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_ficha_confirmada ON public.fichas(ficha_confirmada) WHERE ficha_confirmada = true;
CREATE INDEX IF NOT EXISTS idx_fichas_aprovado ON public.fichas(aprovado) WHERE aprovado IS NOT NULL;

-- Índices para agendamento e presença
CREATE INDEX IF NOT EXISTS idx_fichas_presenca_confirmada ON public.fichas(presenca_confirmada) WHERE presenca_confirmada = true;
CREATE INDEX IF NOT EXISTS idx_fichas_compareceu ON public.fichas(compareceu) WHERE compareceu = true;
CREATE INDEX IF NOT EXISTS idx_fichas_agendado ON public.fichas(agendado) WHERE deleted = false;

-- Índices para sincronização
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON public.fichas(sync_source);
CREATE INDEX IF NOT EXISTS idx_fichas_last_synced ON public.fichas(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_fichas_last_sync_at ON public.fichas(last_sync_at) WHERE last_sync_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_sync_status ON public.fichas(sync_status) WHERE sync_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_date_modify ON public.fichas(date_modify DESC) WHERE date_modify IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_deleted ON public.fichas(deleted);

-- Índices para integrações externas
CREATE INDEX IF NOT EXISTS idx_fichas_bitrix_status ON public.fichas(bitrix_status) WHERE bitrix_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_bitrix_telemarketing_id ON public.fichas(bitrix_telemarketing_id) WHERE bitrix_telemarketing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_commercial_project_id ON public.fichas(commercial_project_id) WHERE commercial_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_maxsystem_id ON public.fichas(maxsystem_id_ficha) WHERE maxsystem_id_ficha IS NOT NULL;

-- Índices para relacionamentos
CREATE INDEX IF NOT EXISTS idx_fichas_scouter_user ON public.fichas(scouter_user_id) WHERE scouter_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_telemarketing_user ON public.fichas(telemarketing_user_id) WHERE telemarketing_user_id IS NOT NULL;

-- ============================================================================
-- PARTE 4: TABELAS DE AUTENTICAÇÃO E PERMISSÕES
-- ============================================================================

-- Tabela de Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  project TEXT, -- 'scouter', 'telemarketing', 'both'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.roles IS 'Roles/papéis disponíveis no sistema';
COMMENT ON COLUMN public.roles.project IS 'Projeto ao qual o role pertence: scouter, telemarketing, ou both';

-- Tabela user_roles (relacionamento usuário-role)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  project TEXT NOT NULL, -- 'scouter', 'telemarketing', 'both'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role, project)
);

COMMENT ON TABLE public.user_roles IS 'Relacionamento entre usuários e seus roles';
COMMENT ON COLUMN public.user_roles.user_id IS 'ID do usuário (referência para auth.users)';
COMMENT ON COLUMN public.user_roles.role IS 'Role atribuído ao usuário';

-- Tabela de Profiles
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

COMMENT ON TABLE public.profiles IS 'Perfis de usuários (compartilhado entre projetos)';

-- Tabela de Permissões
CREATE TABLE IF NOT EXISTS public.permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (role_id, module, action)
);

COMMENT ON TABLE public.permissions IS 'Permissões detalhadas por role e módulo';

-- ============================================================================
-- PARTE 5: TABELAS AUXILIARES DE SINCRONIZAÇÃO
-- ============================================================================

-- Tabela sync_queue (fila de sincronização)
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id TEXT NOT NULL, -- Usar TEXT para compatibilidade com fichas.id
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  sync_direction TEXT NOT NULL DEFAULT 'gestao_to_tabulador',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.sync_queue IS 'Fila de sincronização para enviar alterações ao TabuladorMax';

-- Índices para sync_queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_ficha ON public.sync_queue(ficha_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_direction ON public.sync_queue(sync_direction);

-- Tabela sync_logs (histórico de sincronizações)
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('gestao_to_tabulador', 'tabulador_to_gestao', 'bidirectional')),
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  errors JSONB,
  metadata JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.sync_logs IS 'Auditoria de execuções de sincronização entre TabuladorMax e Gestão Scouter';

-- Índices para sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_direction ON public.sync_logs(sync_direction);
CREATE INDEX IF NOT EXISTS idx_sync_logs_completed ON public.sync_logs(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Tabela sync_status (estado atual da sincronização)
CREATE TABLE IF NOT EXISTS public.sync_status (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_sync_success BOOLEAN DEFAULT FALSE,
  total_records INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.sync_status IS 'Estado atual da sincronização e heartbeat de saúde';

-- Índices para sync_status
CREATE INDEX IF NOT EXISTS idx_sync_status_updated ON public.sync_status(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status_project ON public.sync_status(project_name);

-- ============================================================================
-- PARTE 6: FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Atualiza automaticamente o campo updated_at em modificações';

-- Aplicar triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.fichas;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS roles_updated_at ON public.roles;
CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para adicionar fichas à fila de sincronização
CREATE OR REPLACE FUNCTION public.queue_ficha_for_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Evitar loops: não adicionar à fila se a alteração veio do TabuladorMax recentemente
  IF NEW.sync_source = 'TabuladorMax' AND 
     NEW.last_synced_at IS NOT NULL AND 
     NOW() - NEW.last_synced_at < INTERVAL '1 minute' THEN
    RETURN NEW;
  END IF;

  -- Adicionar à fila de sincronização
  INSERT INTO public.sync_queue (ficha_id, operation, payload, sync_direction)
  VALUES (
    NEW.id,
    TG_OP,
    row_to_json(NEW),
    'gestao_to_tabulador'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.queue_ficha_for_sync() IS 'Trigger function que adiciona fichas modificadas à fila de sincronização';

-- Trigger para sincronização automática de fichas
DROP TRIGGER IF EXISTS fichas_sync_trigger ON public.fichas;
CREATE TRIGGER fichas_sync_trigger
  AFTER INSERT OR UPDATE ON public.fichas
  FOR EACH ROW
  WHEN (NEW.deleted = FALSE) -- Apenas fichas não deletadas
  EXECUTE FUNCTION public.queue_ficha_for_sync();

-- Função para auto-criar perfil de usuário
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
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Atribuir role padrão baseado no projeto
  IF (NEW.raw_user_meta_data->>'project' = 'telemarketing') THEN
    INSERT INTO public.user_roles (user_id, role, project)
    VALUES (NEW.id, 'telemarketing', 'telemarketing')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role, project)
    VALUES (NEW.id, 'scouter', 'scouter')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Cria automaticamente profile e role padrão para novos usuários';

-- Trigger para auto-criar perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PARTE 7: FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- ============================================================================

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

COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 'Verifica se usuário tem determinado role (evita recursão RLS)';

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

COMMENT ON FUNCTION public.user_has_project_access(UUID, TEXT) IS 'Verifica se usuário tem acesso a determinado projeto';

-- ============================================================================
-- PARTE 8: POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- ===== POLÍTICAS PARA FICHAS =====

-- Leitura pública (para integração Lovable e desenvolvimento)
DROP POLICY IF EXISTS "fichas_read_all" ON public.fichas;
CREATE POLICY "fichas_read_all" 
  ON public.fichas 
  FOR SELECT 
  USING (true);

-- Admins podem fazer tudo
DROP POLICY IF EXISTS "Admins can manage fichas" ON public.fichas;
CREATE POLICY "Admins can manage fichas" 
  ON public.fichas 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role tem acesso completo (para Edge Functions)
DROP POLICY IF EXISTS "Service role full access to fichas" ON public.fichas;
CREATE POLICY "Service role full access to fichas"
  ON public.fichas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== POLÍTICAS PARA ROLES (ABERTAS PARA LOVABLE) =====

DROP POLICY IF EXISTS "Public read roles" ON public.roles;
CREATE POLICY "Public read roles" 
  ON public.roles 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Service role manage roles" ON public.roles;
CREATE POLICY "Service role manage roles"
  ON public.roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== POLÍTICAS PARA USER_ROLES (ABERTAS PARA LOVABLE) =====

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id OR true); -- Permite leitura para todos

DROP POLICY IF EXISTS "Service role manage user_roles" ON public.user_roles;
CREATE POLICY "Service role manage user_roles"
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== POLÍTICAS PARA PROFILES (ABERTAS PARA LOVABLE) =====

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role manage profiles" ON public.profiles;
CREATE POLICY "Service role manage profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== POLÍTICAS PARA PERMISSIONS (ABERTAS PARA LOVABLE) =====

DROP POLICY IF EXISTS "Public read permissions" ON public.permissions;
CREATE POLICY "Public read permissions" 
  ON public.permissions 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Service role manage permissions" ON public.permissions;
CREATE POLICY "Service role manage permissions"
  ON public.permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== POLÍTICAS PARA SYNC_QUEUE =====

DROP POLICY IF EXISTS "Service role full access to sync_queue" ON public.sync_queue;
CREATE POLICY "Service role full access to sync_queue"
  ON public.sync_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== POLÍTICAS PARA SYNC_LOGS =====

DROP POLICY IF EXISTS "Service role full access to sync_logs" ON public.sync_logs;
CREATE POLICY "Service role full access to sync_logs"
  ON public.sync_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permitir leitura autenticada para logs (opcional)
DROP POLICY IF EXISTS "Authenticated users can read sync_logs" ON public.sync_logs;
CREATE POLICY "Authenticated users can read sync_logs"
  ON public.sync_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ===== POLÍTICAS PARA SYNC_STATUS =====

DROP POLICY IF EXISTS "Service role full access to sync_status" ON public.sync_status;
CREATE POLICY "Service role full access to sync_status"
  ON public.sync_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permitir leitura autenticada para status (opcional)
DROP POLICY IF EXISTS "Authenticated users can read sync_status" ON public.sync_status;
CREATE POLICY "Authenticated users can read sync_status"
  ON public.sync_status
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PARTE 9: GRANTS DE PERMISSÕES
-- ============================================================================

-- Garantir que service_role tem permissões completas
GRANT ALL ON public.fichas TO service_role;
GRANT ALL ON public.roles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.permissions TO service_role;
GRANT ALL ON public.sync_queue TO service_role;
GRANT ALL ON public.sync_logs TO service_role;
GRANT ALL ON public.sync_status TO service_role;

-- Garantir que funções podem ser executadas
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_ficha_for_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_project_access(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================
-- PARTE 10: SEED DE DADOS INICIAL
-- ============================================================================

-- Inserir roles padrão
INSERT INTO public.roles (id, name, description, project) VALUES
  (1, 'admin', 'Administrador com acesso total', 'both'),
  (2, 'supervisor', 'Supervisor de scouters', 'scouter'),
  (3, 'scouter', 'Scouter de campo', 'scouter'),
  (4, 'gestor_telemarketing', 'Gestor de telemarketing', 'telemarketing'),
  (5, 'telemarketing', 'Operador de telemarketing', 'telemarketing')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  project = EXCLUDED.project;

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
ON CONFLICT (role_id, module, action) DO UPDATE SET
  allowed = EXCLUDED.allowed;

-- Inserir registros iniciais em sync_status
INSERT INTO public.sync_status (id, project_name, last_sync_success, total_records, updated_at)
VALUES 
  ('gestao_scouter', 'gestao_scouter', false, 0, NOW()),
  ('tabulador_max', 'tabulador_max', false, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTE 11: VERIFICAÇÕES FINAIS
-- ============================================================================

DO $$
DECLARE
  fichas_columns INTEGER;
  expected_columns INTEGER := 36;
  tables_count INTEGER;
  indices_count INTEGER;
  triggers_count INTEGER;
BEGIN
  -- Verificar colunas em fichas
  SELECT COUNT(*) INTO fichas_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name IN (
      'name', 'responsible', 'age', 'address', 'photo_url',
      'celular', 'telefone_trabalho', 'telefone_casa',
      'bitrix_telemarketing_id', 'commercial_project_id', 'responsible_user_id',
      'fonte', 'nome_modelo', 'local_abordagem',
      'ficha_confirmada', 'data_criacao_ficha', 'data_confirmacao_ficha',
      'cadastro_existe_foto', 'presenca_confirmada', 'compareceu',
      'data_criacao_agendamento', 'horario_agendamento', 'data_agendamento',
      'data_retorno_ligacao', 'gerenciamento_funil', 'status_fluxo',
      'etapa_funil', 'etapa_fluxo', 'funil_fichas', 'status_tabulacao',
      'maxsystem_id_ficha', 'gestao_scouter', 'op_telemarketing',
      'date_modify', 'last_sync_at', 'sync_status'
    );
  
  -- Verificar tabelas criadas
  SELECT COUNT(*) INTO tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('fichas', 'roles', 'user_roles', 'profiles', 'permissions', 
                       'sync_queue', 'sync_logs', 'sync_status');
  
  -- Verificar índices
  SELECT COUNT(*) INTO indices_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'fichas';
  
  -- Verificar triggers
  SELECT COUNT(*) INTO triggers_count
  FROM pg_trigger
  WHERE tgname IN ('set_updated_at', 'fichas_sync_trigger', 'on_auth_user_created')
    AND tgrelid IN ('public.fichas'::regclass, 'auth.users'::regclass);
  
  -- Relatório
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT EXECUTADO COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Colunas adicionadas em fichas: %/%', fichas_columns, expected_columns;
  RAISE NOTICE 'Tabelas criadas: %/8', tables_count;
  RAISE NOTICE 'Índices criados em fichas: %', indices_count;
  RAISE NOTICE 'Triggers criados: %/3', triggers_count;
  RAISE NOTICE '========================================';
  
  IF fichas_columns < expected_columns THEN
    RAISE WARNING '⚠️ Algumas colunas podem não ter sido criadas: % de % esperadas', fichas_columns, expected_columns;
  END IF;
  
  IF tables_count < 8 THEN
    RAISE WARNING '⚠️ Algumas tabelas podem não ter sido criadas: % de 8 esperadas', tables_count;
  END IF;
END $$;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- 
-- ✅ SUCESSO! O schema do banco de dados foi criado/atualizado.
--
-- Próximos passos:
-- 1. Verificar os logs acima para confirmar que tudo foi criado
-- 2. Testar a aplicação front-end para verificar se os dados são exibidos
-- 3. Executar importação de dados se necessário
-- 4. Testar sincronização bidirecional
--
-- Para mais informações, consulte:
-- - docs/VALIDACAO_SCHEMA.md
-- - docs/IMPORTACAO_DADOS.md
-- - docs/TESTE_SINCRONIZACAO.md
--
-- ============================================================================
