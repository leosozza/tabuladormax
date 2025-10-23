
-- Criar tabela para armazenar leads/fichas do Bitrix24
CREATE TABLE public.bitrix_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bitrix_id INTEGER NOT NULL UNIQUE,
  etapa TEXT,
  data_de_criacao_da_ficha TIMESTAMP WITH TIME ZONE,
  primeiro_nome TEXT,
  nome_do_modelo TEXT,
  foto_do_modelo TEXT,
  telefone_de_trabalho TEXT,
  celular TEXT,
  local_da_abordagem TEXT,
  op_telemarketing TEXT,
  ficha_confirmada TEXT,
  cadastro_existe_foto TEXT,
  scouter TEXT,
  idade INTEGER,
  agencia_e_seletivas TEXT,
  alerta TEXT,
  valor_da_ficha TEXT,
  status_da_ficha TEXT,
  fonte TEXT,
  gerenciamento_funil TEXT,
  etapa_funil TEXT,
  supervisor_do_scouter TEXT,
  presenca_confirmada TEXT,
  data_do_agendamento TIMESTAMP WITH TIME ZONE,
  lead_score TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para configurações da integração Bitrix24
CREATE TABLE public.bitrix_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  domain TEXT NOT NULL,
  webhook_url TEXT,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 15,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  leads_stage_mapping JSONB DEFAULT '{}',
  scouter_field_mapping JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para logs de sincronização
CREATE TABLE public.bitrix_sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  sync_type TEXT NOT NULL, -- 'leads', 'projects', 'full'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para controle de pagamentos/atualizações no Bitrix
CREATE TABLE public.bitrix_payment_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  scouter_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  total_fichas INTEGER NOT NULL,
  total_ajuda_custo DECIMAL(10,2) NOT NULL,
  dias_trabalhados INTEGER NOT NULL,
  dias_folga INTEGER NOT NULL,
  dias_falta INTEGER NOT NULL,
  bitrix_lead_ids INTEGER[] DEFAULT '{}',
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  bitrix_update_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'confirmed', 'failed'
  sent_to_bitrix_at TIMESTAMP WITH TIME ZONE,
  bitrix_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_bitrix_leads_updated_at 
  BEFORE UPDATE ON public.bitrix_leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bitrix_settings_updated_at 
  BEFORE UPDATE ON public.bitrix_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bitrix_payment_updates_updated_at 
  BEFORE UPDATE ON public.bitrix_payment_updates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.bitrix_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_payment_updates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bitrix_leads (dados públicos para análise, mas com controle)
CREATE POLICY "Allow read access to bitrix_leads" 
  ON public.bitrix_leads 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert to bitrix_leads for authenticated users" 
  ON public.bitrix_leads 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to bitrix_leads for authenticated users" 
  ON public.bitrix_leads 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Políticas RLS para bitrix_settings (por usuário)
CREATE POLICY "Users can manage their own bitrix settings" 
  ON public.bitrix_settings 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas RLS para bitrix_sync_runs (por usuário)
CREATE POLICY "Users can view their own sync runs" 
  ON public.bitrix_sync_runs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync runs" 
  ON public.bitrix_sync_runs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync runs" 
  ON public.bitrix_sync_runs 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Políticas RLS para bitrix_payment_updates (por usuário)
CREATE POLICY "Users can manage their own payment updates" 
  ON public.bitrix_payment_updates 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX idx_bitrix_leads_bitrix_id ON public.bitrix_leads(bitrix_id);
CREATE INDEX idx_bitrix_leads_scouter ON public.bitrix_leads(scouter);
CREATE INDEX idx_bitrix_leads_agencia ON public.bitrix_leads(agencia_e_seletivas);
CREATE INDEX idx_bitrix_leads_data_criacao ON public.bitrix_leads(data_de_criacao_da_ficha);
CREATE INDEX idx_bitrix_leads_etapa ON public.bitrix_leads(etapa);
CREATE INDEX idx_bitrix_sync_runs_user_status ON public.bitrix_sync_runs(user_id, status);
CREATE INDEX idx_bitrix_payment_updates_user_status ON public.bitrix_payment_updates(user_id, payment_status);
