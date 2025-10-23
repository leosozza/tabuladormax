-- ============================================================
-- SINCRONIZAÇÃO COMPLETA DE SCHEMA: TabuladorMax → Gestão Scouter
-- Adiciona 18 colunas faltantes + índices de performance
-- ============================================================

-- 1️⃣ CAMPOS DE CONTATO (3 colunas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS celular TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS telefone_casa TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS telefone_trabalho TEXT;

-- 2️⃣ CAMPOS DE STATUS E FLUXO (4 colunas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS etapa_fluxo TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS etapa_funil TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_fluxo TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_tabulacao TEXT;

-- 3️⃣ CAMPOS DE FICHA E AGENDAMENTO (4 colunas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cadastro_existe_foto BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_criacao_ficha TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_confirmacao_ficha TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS horario_agendamento TEXT;

-- 4️⃣ CAMPOS DE ORIGEM E INTEGRAÇÃO (4 colunas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS fonte TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nome_modelo TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS op_telemarketing TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS maxsystem_id_ficha TEXT;

-- 5️⃣ CAMPOS DE RELACIONAMENTO (2 colunas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS responsible TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS responsible_user_id UUID;

-- 6️⃣ CAMPO DE AUDITORIA (1 coluna)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS date_modify TIMESTAMPTZ;

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_leads_cadastro_foto 
ON public.leads(cadastro_existe_foto) 
WHERE cadastro_existe_foto = true;

CREATE INDEX IF NOT EXISTS idx_leads_celular 
ON public.leads(celular) 
WHERE celular IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_responsible 
ON public.leads(responsible) 
WHERE responsible IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_fonte 
ON public.leads(fonte) 
WHERE fonte IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_status_fluxo 
ON public.leads(status_fluxo) 
WHERE status_fluxo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_etapa_fluxo 
ON public.leads(etapa_fluxo) 
WHERE etapa_fluxo IS NOT NULL;

-- ============================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================

COMMENT ON COLUMN public.leads.celular IS 'Telefone celular principal do lead';
COMMENT ON COLUMN public.leads.telefone_casa IS 'Telefone residencial do lead';
COMMENT ON COLUMN public.leads.telefone_trabalho IS 'Telefone comercial do lead';
COMMENT ON COLUMN public.leads.etapa_fluxo IS 'Etapa atual no fluxo de trabalho';
COMMENT ON COLUMN public.leads.etapa_funil IS 'Etapa atual no funil de vendas';
COMMENT ON COLUMN public.leads.status_fluxo IS 'Status atual do fluxo';
COMMENT ON COLUMN public.leads.status_tabulacao IS 'Status da tabulação';
COMMENT ON COLUMN public.leads.cadastro_existe_foto IS 'Indica se o cadastro possui foto anexada';
COMMENT ON COLUMN public.leads.data_criacao_ficha IS 'Data de criação da ficha';
COMMENT ON COLUMN public.leads.data_confirmacao_ficha IS 'Data de confirmação da ficha';
COMMENT ON COLUMN public.leads.horario_agendamento IS 'Horário do agendamento';
COMMENT ON COLUMN public.leads.fonte IS 'Fonte de origem do lead';
COMMENT ON COLUMN public.leads.nome_modelo IS 'Nome do modelo de captação';
COMMENT ON COLUMN public.leads.op_telemarketing IS 'Operador de telemarketing responsável';
COMMENT ON COLUMN public.leads.maxsystem_id_ficha IS 'ID da ficha no MaxSystem';
COMMENT ON COLUMN public.leads.responsible IS 'Nome do responsável pelo lead';
COMMENT ON COLUMN public.leads.responsible_user_id IS 'UUID do usuário responsável';
COMMENT ON COLUMN public.leads.date_modify IS 'Data da última modificação';

-- ============================================================
-- RECARREGAR SCHEMA CACHE DO POSTGREST
-- ============================================================

NOTIFY pgrst, 'reload schema';