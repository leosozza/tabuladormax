-- ============================================================================
-- Migration: Sincronizar schema fichas ← leads (TabuladorMax)
-- ============================================================================
-- Data: 2025-10-18
-- Descrição: Adiciona colunas faltantes na tabela fichas para alinhar com
--            o schema da tabela leads do projeto TabuladorMax, permitindo
--            sincronização bidirecional completa.
--
-- Objetivo: Garantir que todas as colunas presentes em leads (TabuladorMax)
--           também existam em fichas (Gestão Scouter).
--
-- Estratégia:
-- - Usar ADD COLUMN IF NOT EXISTS para evitar erros em re-execuções
-- - Manter tipos de dados compatíveis entre projetos
-- - Não remover ou alterar colunas existentes
-- - Adicionar apenas as colunas que faltam
--
-- Categorias de colunas adicionadas:
-- 1. Informações de contato e identificação
-- 2. Integrações Bitrix e projetos comerciais
-- 3. Confirmação e validação de fichas
-- 4. Agendamento e presença
-- 5. Gerenciamento de funil e fluxo
-- 6. Integração com sistemas externos
-- 7. Metadados de sincronização
-- ============================================================================

-- ============================================================================
-- 1. INFORMAÇÕES DE CONTATO E IDENTIFICAÇÃO
-- ============================================================================

-- Nome completo do lead
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Responsável pelo lead
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS responsible TEXT;

-- Idade do lead
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Endereço completo
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS address TEXT;

-- URL da foto do lead
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Telefones de contato
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS celular TEXT;

ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS telefone_trabalho TEXT;

ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS telefone_casa TEXT;

-- ============================================================================
-- 2. INTEGRAÇÕES BITRIX E PROJETOS COMERCIAIS
-- ============================================================================

-- ID do telemarketing no Bitrix
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS bitrix_telemarketing_id BIGINT;

-- ID do projeto comercial (referência UUID)
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS commercial_project_id UUID;

-- ID do usuário responsável (referência UUID)
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS responsible_user_id UUID;

-- Fonte do lead
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS fonte TEXT;

-- Nome do modelo utilizado
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS nome_modelo TEXT;

-- Local onde o lead foi abordado
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS local_abordagem TEXT;

-- ============================================================================
-- 3. CONFIRMAÇÃO E VALIDAÇÃO DE FICHAS
-- ============================================================================

-- Indica se a ficha foi confirmada
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS ficha_confirmada BOOLEAN DEFAULT false;

-- Data de criação da ficha
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS data_criacao_ficha TIMESTAMPTZ;

-- Data de confirmação da ficha
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS data_confirmacao_ficha TIMESTAMPTZ;

-- Indica se existe foto no cadastro
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS cadastro_existe_foto BOOLEAN DEFAULT false;

-- ============================================================================
-- 4. AGENDAMENTO E PRESENÇA
-- ============================================================================

-- Indica se a presença foi confirmada
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS presenca_confirmada BOOLEAN DEFAULT false;

-- Indica se o lead compareceu
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS compareceu BOOLEAN DEFAULT false;

-- Data de criação do agendamento
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS data_criacao_agendamento TIMESTAMPTZ;

-- Horário do agendamento (texto livre ou formato específico)
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS horario_agendamento TEXT;

-- Data do agendamento
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS data_agendamento DATE;

-- Data para retorno de ligação
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS data_retorno_ligacao TIMESTAMPTZ;

-- ============================================================================
-- 5. GERENCIAMENTO DE FUNIL E FLUXO
-- ============================================================================

-- Gerenciamento de funil
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS gerenciamento_funil TEXT;

-- Status no fluxo
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS status_fluxo TEXT;

-- Etapa do funil
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS etapa_funil TEXT;

-- Etapa do fluxo
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS etapa_fluxo TEXT;

-- Funil de fichas
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS funil_fichas TEXT;

-- Status de tabulação
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS status_tabulacao TEXT;

-- ============================================================================
-- 6. INTEGRAÇÃO COM SISTEMAS EXTERNOS
-- ============================================================================

-- ID da ficha no MaxSystem
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS maxsystem_id_ficha TEXT;

-- Identificador do sistema Gestão Scouter
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS gestao_scouter TEXT;

-- Operador de telemarketing
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS op_telemarketing TEXT;

-- ============================================================================
-- 7. METADADOS DE SINCRONIZAÇÃO E AUDITORIA
-- ============================================================================

-- Data de modificação do registro
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS date_modify TIMESTAMPTZ;

-- Timestamp da última sincronização (diferente de last_synced_at)
-- last_sync_at: usado pelo TabuladorMax
-- last_synced_at: usado pelo Gestão Scouter (já existe)
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Status da sincronização
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS sync_status TEXT;

-- ============================================================================
-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON COLUMN public.fichas.name IS 'Nome completo do lead';
COMMENT ON COLUMN public.fichas.responsible IS 'Responsável pelo lead';
COMMENT ON COLUMN public.fichas.age IS 'Idade do lead';
COMMENT ON COLUMN public.fichas.address IS 'Endereço completo';
COMMENT ON COLUMN public.fichas.photo_url IS 'URL da foto do lead';
COMMENT ON COLUMN public.fichas.celular IS 'Telefone celular';
COMMENT ON COLUMN public.fichas.telefone_trabalho IS 'Telefone do trabalho';
COMMENT ON COLUMN public.fichas.telefone_casa IS 'Telefone residencial';

COMMENT ON COLUMN public.fichas.bitrix_telemarketing_id IS 'ID do telemarketing no Bitrix CRM';
COMMENT ON COLUMN public.fichas.commercial_project_id IS 'ID do projeto comercial (UUID)';
COMMENT ON COLUMN public.fichas.responsible_user_id IS 'ID do usuário responsável (UUID)';
COMMENT ON COLUMN public.fichas.fonte IS 'Fonte/origem do lead';
COMMENT ON COLUMN public.fichas.nome_modelo IS 'Nome do modelo utilizado';
COMMENT ON COLUMN public.fichas.local_abordagem IS 'Local onde o lead foi abordado';

COMMENT ON COLUMN public.fichas.ficha_confirmada IS 'Indica se a ficha foi confirmada';
COMMENT ON COLUMN public.fichas.data_criacao_ficha IS 'Data de criação da ficha';
COMMENT ON COLUMN public.fichas.data_confirmacao_ficha IS 'Data de confirmação da ficha';
COMMENT ON COLUMN public.fichas.cadastro_existe_foto IS 'Indica se existe foto no cadastro';

COMMENT ON COLUMN public.fichas.presenca_confirmada IS 'Indica se a presença foi confirmada';
COMMENT ON COLUMN public.fichas.compareceu IS 'Indica se o lead compareceu ao agendamento';
COMMENT ON COLUMN public.fichas.data_criacao_agendamento IS 'Data de criação do agendamento';
COMMENT ON COLUMN public.fichas.horario_agendamento IS 'Horário do agendamento';
COMMENT ON COLUMN public.fichas.data_agendamento IS 'Data do agendamento';
COMMENT ON COLUMN public.fichas.data_retorno_ligacao IS 'Data programada para retorno de ligação';

COMMENT ON COLUMN public.fichas.gerenciamento_funil IS 'Gerenciamento de funil de vendas';
COMMENT ON COLUMN public.fichas.status_fluxo IS 'Status atual no fluxo de trabalho';
COMMENT ON COLUMN public.fichas.etapa_funil IS 'Etapa atual no funil de vendas';
COMMENT ON COLUMN public.fichas.etapa_fluxo IS 'Etapa atual no fluxo de trabalho';
COMMENT ON COLUMN public.fichas.funil_fichas IS 'Funil específico de fichas';
COMMENT ON COLUMN public.fichas.status_tabulacao IS 'Status da tabulação do lead';

COMMENT ON COLUMN public.fichas.maxsystem_id_ficha IS 'ID da ficha no sistema MaxSystem';
COMMENT ON COLUMN public.fichas.gestao_scouter IS 'Identificador do sistema Gestão Scouter';
COMMENT ON COLUMN public.fichas.op_telemarketing IS 'Operador de telemarketing responsável';

COMMENT ON COLUMN public.fichas.date_modify IS 'Data da última modificação do registro';
COMMENT ON COLUMN public.fichas.last_sync_at IS 'Timestamp da última sincronização (TabuladorMax)';
COMMENT ON COLUMN public.fichas.sync_status IS 'Status da sincronização (pending, synced, error)';

-- ============================================================================
-- 9. ÍNDICES PARA OTIMIZAÇÃO DE QUERIES
-- ============================================================================

-- Índices para campos de identificação e busca
CREATE INDEX IF NOT EXISTS idx_fichas_name ON public.fichas(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_celular ON public.fichas(celular) WHERE celular IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_responsible ON public.fichas(responsible) WHERE responsible IS NOT NULL;

-- Índices para integrações externas
CREATE INDEX IF NOT EXISTS idx_fichas_bitrix_telemarketing_id ON public.fichas(bitrix_telemarketing_id) WHERE bitrix_telemarketing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_commercial_project_id ON public.fichas(commercial_project_id) WHERE commercial_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_maxsystem_id ON public.fichas(maxsystem_id_ficha) WHERE maxsystem_id_ficha IS NOT NULL;

-- Índices para status e funil
CREATE INDEX IF NOT EXISTS idx_fichas_status_fluxo ON public.fichas(status_fluxo) WHERE status_fluxo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_etapa_funil ON public.fichas(etapa_funil) WHERE etapa_funil IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_ficha_confirmada ON public.fichas(ficha_confirmada) WHERE ficha_confirmada = true;

-- Índices para agendamento
CREATE INDEX IF NOT EXISTS idx_fichas_data_agendamento ON public.fichas(data_agendamento) WHERE data_agendamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_presenca_confirmada ON public.fichas(presenca_confirmada) WHERE presenca_confirmada = true;
CREATE INDEX IF NOT EXISTS idx_fichas_compareceu ON public.fichas(compareceu) WHERE compareceu = true;

-- Índices para sincronização
CREATE INDEX IF NOT EXISTS idx_fichas_sync_status ON public.fichas(sync_status) WHERE sync_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_last_sync_at ON public.fichas(last_sync_at) WHERE last_sync_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fichas_date_modify ON public.fichas(date_modify DESC) WHERE date_modify IS NOT NULL;

-- ============================================================================
-- 10. VERIFICAÇÃO DA MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
  column_count INTEGER;
  expected_new_columns INTEGER := 36;
BEGIN
  -- Contar quantas das novas colunas foram criadas
  SELECT COUNT(*) INTO column_count
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
  
  IF column_count = expected_new_columns THEN
    RAISE NOTICE '✅ Migration concluída com sucesso!';
    RAISE NOTICE '✅ Total de colunas adicionadas: % de %', column_count, expected_new_columns;
  ELSE
    RAISE WARNING '⚠️ Esperado % colunas, encontrado %', expected_new_columns, column_count;
  END IF;
  
  RAISE NOTICE 'ℹ️ Schema da tabela fichas agora está alinhado com a tabela leads do TabuladorMax';
  RAISE NOTICE 'ℹ️ Sincronização bidirecional completa está habilitada';
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
-- Notas:
-- - Esta migration é idempotente (pode ser executada múltiplas vezes)
-- - Nenhuma coluna existente foi removida ou alterada
-- - Todos os índices foram criados com IF NOT EXISTS
-- - Comentários adicionados para facilitar manutenção futura
-- ============================================================================
