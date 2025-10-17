-- Adicionar 28 novas colunas prioritárias na tabela leads

-- 1. Informações Básicas (4 novos)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS etapa TEXT,
  ADD COLUMN IF NOT EXISTS nome_modelo TEXT,
  ADD COLUMN IF NOT EXISTS criado TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fonte TEXT;

-- 2. Contatos (3 novos)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS telefone_trabalho TEXT,
  ADD COLUMN IF NOT EXISTS celular TEXT,
  ADD COLUMN IF NOT EXISTS telefone_casa TEXT;

-- 3. Endereço (1 novo)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS local_abordagem TEXT;

-- 4. Modelo/Ficha (7 novos)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS ficha_confirmada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_criacao_ficha TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_confirmacao_ficha TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presenca_confirmada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS compareceu BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cadastro_existe_foto BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_ficha NUMERIC(10,2);

-- 5. Agendamento (3 novos)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS data_criacao_agendamento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS horario_agendamento TEXT,
  ADD COLUMN IF NOT EXISTS data_agendamento DATE;

-- 6. Fluxo/Funil (6 novos)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS gerenciamento_funil TEXT,
  ADD COLUMN IF NOT EXISTS status_fluxo TEXT,
  ADD COLUMN IF NOT EXISTS etapa_funil TEXT,
  ADD COLUMN IF NOT EXISTS etapa_fluxo TEXT,
  ADD COLUMN IF NOT EXISTS funil_fichas TEXT,
  ADD COLUMN IF NOT EXISTS status_tabulacao TEXT;

-- 7. MaxSystem/Integrações (1 novo)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS maxsystem_id_ficha TEXT;

-- 8. Gestão/Projetos (2 novos)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS gestao_scouter TEXT,
  ADD COLUMN IF NOT EXISTS op_telemarketing TEXT;

-- 9. Outros (1 novo)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS data_retorno_ligacao TIMESTAMPTZ;

-- Criar índices para os campos mais consultados (10 índices)
CREATE INDEX IF NOT EXISTS idx_leads_etapa ON leads(etapa);
CREATE INDEX IF NOT EXISTS idx_leads_criado ON leads(criado);
CREATE INDEX IF NOT EXISTS idx_leads_celular ON leads(celular);
CREATE INDEX IF NOT EXISTS idx_leads_ficha_confirmada ON leads(ficha_confirmada);
CREATE INDEX IF NOT EXISTS idx_leads_presenca_confirmada ON leads(presenca_confirmada);
CREATE INDEX IF NOT EXISTS idx_leads_compareceu ON leads(compareceu);
CREATE INDEX IF NOT EXISTS idx_leads_etapa_funil ON leads(etapa_funil);
CREATE INDEX IF NOT EXISTS idx_leads_status_fluxo ON leads(status_fluxo);
CREATE INDEX IF NOT EXISTS idx_leads_data_agendamento ON leads(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_leads_maxsystem_id_ficha ON leads(maxsystem_id_ficha);