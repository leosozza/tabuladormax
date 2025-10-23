-- FASE 1: CONSOLIDAÇÃO DAS TABELAS LEADS
-- Este script vai unificar as tabelas Leads (maiúscula) e leads (minúscula)

-- 1. Backup da tabela com dados
ALTER TABLE IF EXISTS public."Leads" RENAME TO leads_backup;

-- 2. Dropar tabela vazia se existir
DROP TABLE IF EXISTS public.leads CASCADE;

-- 3. Criar tabela unificada com schema correto
CREATE TABLE public.leads (
  -- IDs
  id BIGSERIAL PRIMARY KEY,
  
  -- Dados pessoais
  name TEXT,
  age INTEGER,
  address TEXT,
  celular BIGINT,
  telefone_trabalho BIGINT,
  telefone_casa BIGINT,
  
  -- Projeto e equipe
  scouter TEXT,
  responsible TEXT,
  responsible_user_id TEXT,
  commercial_project_id TEXT,
  
  -- Status e etapas
  etapa TEXT,
  fonte TEXT,
  ficha_confirmada BOOLEAN DEFAULT false,
  presenca_confirmada BOOLEAN DEFAULT false,
  compareceu BOOLEAN DEFAULT false,
  cadastro_existe_foto BOOLEAN DEFAULT false,
  
  -- Datas
  criado TIMESTAMPTZ DEFAULT now(),
  data_criacao_ficha TIMESTAMPTZ,
  data_confirmacao_ficha TIMESTAMPTZ,
  data_agendamento TEXT,
  horario_agendamento TEXT,
  data_criacao_agendamento TIMESTAMPTZ,
  data_retorno_ligacao TIMESTAMPTZ,
  date_modify TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Valores
  valor_ficha DOUBLE PRECISION,
  
  -- Localização
  local_abordagem TEXT,
  nome_modelo TEXT,
  
  -- Funil e gerenciamento
  funil_fichas TEXT,
  etapa_fluxo TEXT,
  etapa_funil TEXT,
  status_fluxo TEXT,
  gerenciamento_funil TEXT,
  status_tabulacao TEXT,
  
  -- Integrações
  bitrix_telemarketing_id BIGINT,
  maxsystem_id_ficha TEXT,
  gestao_scouter TEXT,
  op_telemarketing TEXT,
  
  -- Sync
  sync_source TEXT,
  sync_status TEXT DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  
  -- Mídia
  photo_url TEXT,
  
  -- Raw data e metadata
  raw JSONB,
  deleted BOOLEAN DEFAULT false
);

-- 4. Migrar dados do backup se existir
INSERT INTO public.leads (
  id, name, age, address, scouter, responsible, responsible_user_id,
  commercial_project_id, etapa, fonte, criado, ficha_confirmada,
  presenca_confirmada, compareceu, cadastro_existe_foto, valor_ficha,
  data_criacao_ficha, data_confirmacao_ficha, data_agendamento,
  horario_agendamento, data_criacao_agendamento, data_retorno_ligacao,
  celular, telefone_trabalho, telefone_casa, local_abordagem,
  nome_modelo, funil_fichas, etapa_fluxo, etapa_funil, status_fluxo,
  gerenciamento_funil, status_tabulacao, bitrix_telemarketing_id,
  maxsystem_id_ficha, gestao_scouter, op_telemarketing, photo_url,
  date_modify, updated_at, raw, sync_source, sync_status, last_sync_at
)
SELECT 
  id, name, age, address, scouter, responsible, responsible_user_id,
  commercial_project_id, etapa, fonte, criado, ficha_confirmada,
  presenca_confirmada, compareceu, cadastro_existe_foto, valor_ficha,
  data_criacao_ficha, data_confirmacao_ficha, data_agendamento,
  horario_agendamento, data_criacao_agendamento, data_retorno_ligacao,
  celular, telefone_trabalho, telefone_casa, local_abordagem,
  nome_modelo, funil_fichas, etapa_fluxo, etapa_funil, status_fluxo,
  gerenciamento_funil, status_tabulacao, bitrix_telemarketing_id,
  maxsystem_id_ficha, gestao_scouter, op_telemarketing, photo_url,
  date_modify, updated_at, raw, sync_source, sync_status, last_sync_at
FROM public.leads_backup
WHERE EXISTS (SELECT 1 FROM public.leads_backup LIMIT 1);

-- 5. Dropar backup
DROP TABLE IF EXISTS public.leads_backup;

-- 6. Inserir dados fictícios para teste
INSERT INTO public.leads (
  name, age, scouter, commercial_project_id, etapa, 
  criado, valor_ficha, ficha_confirmada, address, photo_url,
  celular, fonte, cadastro_existe_foto
) VALUES
  ('João Silva', 25, 'Maria Santos', 'Projeto Alpha', 'Novo', NOW() - INTERVAL '5 days', 150.00, true, 'Rua A, 123', 'https://i.pravatar.cc/300?img=1', 11987654321, 'Indicação', true),
  ('Ana Costa', 30, 'Pedro Lima', 'Projeto Beta', 'Contato', NOW() - INTERVAL '4 days', 200.00, false, 'Av. B, 456', 'https://i.pravatar.cc/300?img=2', 11987654322, 'Website', false),
  ('Carlos Souza', 28, 'Maria Santos', 'Projeto Alpha', 'Agendado', NOW() - INTERVAL '3 days', 150.00, true, 'Rua C, 789', 'https://i.pravatar.cc/300?img=3', 11987654323, 'Indicação', true),
  ('Mariana Rocha', 22, 'José Alves', 'Projeto Gamma', 'Convertido', NOW() - INTERVAL '2 days', 300.00, true, 'Rua D, 101', 'https://i.pravatar.cc/300?img=4', 11987654324, 'Instagram', true),
  ('Felipe Oliveira', 35, 'Pedro Lima', 'Projeto Beta', 'Novo', NOW() - INTERVAL '1 day', 200.00, false, 'Av. E, 202', 'https://i.pravatar.cc/300?img=5', 11987654325, 'Facebook', false),
  ('Juliana Martins', 27, 'Maria Santos', 'Projeto Alpha', 'Contato', NOW(), 150.00, true, 'Rua F, 303', 'https://i.pravatar.cc/300?img=6', 11987654326, 'Indicação', true),
  ('Roberto Dias', 32, 'José Alves', 'Projeto Gamma', 'Agendado', NOW() - INTERVAL '6 days', 300.00, false, 'Av. G, 404', 'https://i.pravatar.cc/300?img=7', 11987654327, 'Google', true),
  ('Camila Pereira', 24, 'Pedro Lima', 'Projeto Beta', 'Convertido', NOW() - INTERVAL '7 days', 200.00, true, 'Rua H, 505', 'https://i.pravatar.cc/300?img=8', 11987654328, 'Indicação', true),
  ('Lucas Fernandes', 29, 'Maria Santos', 'Projeto Alpha', 'Novo', NOW() - INTERVAL '8 days', 150.00, false, 'Av. I, 606', 'https://i.pravatar.cc/300?img=9', 11987654329, 'Website', false),
  ('Beatriz Lima', 26, 'José Alves', 'Projeto Gamma', 'Contato', NOW() - INTERVAL '9 days', 300.00, true, 'Rua J, 707', 'https://i.pravatar.cc/300?img=10', 11987654330, 'Instagram', true);

-- 7. Políticas RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read leads"
ON public.leads FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role full access to leads"
ON public.leads FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 8. Índices para performance
CREATE INDEX idx_leads_scouter ON public.leads(scouter);
CREATE INDEX idx_leads_projeto ON public.leads(commercial_project_id);
CREATE INDEX idx_leads_criado ON public.leads(criado);
CREATE INDEX idx_leads_etapa ON public.leads(etapa);
CREATE INDEX idx_leads_deleted ON public.leads(deleted) WHERE deleted = false;
CREATE INDEX idx_leads_sync ON public.leads(sync_status, last_sync_at);

-- 9. Trigger para updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();