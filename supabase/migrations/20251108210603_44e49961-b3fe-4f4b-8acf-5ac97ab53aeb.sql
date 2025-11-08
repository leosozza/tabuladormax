-- FASE 1: Criar Tabela de Mapeamento de Campos do Gestão Scouter
CREATE TABLE gestao_scouter_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campo no banco de dados (leads table)
  database_field TEXT NOT NULL,
  
  -- Nome de exibição (label)
  display_name TEXT NOT NULL,
  
  -- Tipo do campo
  field_type TEXT NOT NULL, -- 'text', 'number', 'boolean', 'date', 'currency'
  
  -- Categoria para agrupamento
  category TEXT NOT NULL, -- 'basic', 'contact', 'status', 'location', 'dates', 'sync', 'other'
  
  -- Configurações de exibição
  default_visible BOOLEAN DEFAULT false,
  sortable BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Para ordenação
  
  -- Função de formatação (nome da função)
  formatter_function TEXT, -- 'formatDateBR', 'formatCurrency', 'formatBoolean', etc.
  
  -- Ativo
  active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraint: campo único por database_field
  CONSTRAINT unique_database_field UNIQUE (database_field)
);

-- Índices
CREATE INDEX idx_gestao_scouter_field_mappings_active ON gestao_scouter_field_mappings(active);
CREATE INDEX idx_gestao_scouter_field_mappings_category ON gestao_scouter_field_mappings(category);
CREATE INDEX idx_gestao_scouter_field_mappings_priority ON gestao_scouter_field_mappings(priority);

-- RLS Policies
ALTER TABLE gestao_scouter_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar mapeamentos ativos"
  ON gestao_scouter_field_mappings FOR SELECT
  USING (active = true);

CREATE POLICY "Admins e managers podem gerenciar mapeamentos"
  ON gestao_scouter_field_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_gestao_scouter_field_mappings_updated_at
  BEFORE UPDATE ON gestao_scouter_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registrar histórico
CREATE TRIGGER log_gestao_scouter_field_mapping_changes
  AFTER INSERT OR UPDATE OR DELETE ON gestao_scouter_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION log_field_mapping_change();

-- Popular com campos existentes do leadFields.ts
INSERT INTO gestao_scouter_field_mappings (
  database_field, display_name, field_type, category, default_visible, sortable, formatter_function, priority
) VALUES
  ('name', 'Nome', 'text', 'basic', true, true, NULL, 1),
  ('age', 'Idade', 'number', 'basic', false, true, NULL, 2),
  ('celular', 'Celular', 'text', 'contact', true, true, NULL, 3),
  ('telefone_casa', 'Telefone Casa', 'text', 'contact', false, true, NULL, 4),
  ('telefone_trabalho', 'Telefone Trabalho', 'text', 'contact', false, true, NULL, 5),
  ('scouter', 'Scouter', 'text', 'basic', true, true, NULL, 6),
  ('nome_modelo', 'Projeto', 'text', 'basic', true, true, NULL, 7),
  ('status_tabulacao', 'Status Tabulação', 'text', 'status', true, true, NULL, 8),
  ('criado', 'Data Criação', 'date', 'dates', true, true, 'formatDateBR', 9),
  ('ficha_confirmada', 'Ficha Confirmada', 'boolean', 'status', true, true, 'formatBoolean', 10),
  ('address', 'Endereço', 'text', 'location', false, true, NULL, 11),
  ('local_abordagem', 'Local de Abordagem', 'text', 'location', false, true, NULL, 12),
  ('etapa', 'Etapa', 'text', 'status', true, true, NULL, 13),
  ('gestao_scouter', 'Gestão Scouter', 'text', 'status', false, true, NULL, 14),
  ('op_telemarketing', 'Op. Telemarketing', 'text', 'basic', false, true, NULL, 15),
  ('qualidade_lead', 'Qualidade Lead', 'text', 'status', false, true, NULL, 16),
  ('data_criacao_ficha', 'Data Criação Ficha', 'date', 'dates', false, true, 'formatDateBR', 17),
  ('data_confirmacao_ficha', 'Data Confirmação Ficha', 'date', 'dates', false, true, 'formatDateBR', 18),
  ('data_agendamento', 'Data Agendamento', 'date', 'dates', false, true, 'formatDateBR', 19),
  ('horario_agendamento', 'Horário Agendamento', 'text', 'dates', false, true, NULL, 20),
  ('presenca_confirmada', 'Presença Confirmada', 'boolean', 'status', false, true, 'formatBoolean', 21),
  ('compareceu', 'Compareceu', 'boolean', 'status', false, true, 'formatBoolean', 22),
  ('valor_ficha', 'Valor Ficha', 'currency', 'basic', false, true, 'formatCurrency', 23),
  ('cadastro_existe_foto', 'Cadastro Existe Foto', 'boolean', 'status', false, true, 'formatBoolean', 24),
  ('photo_url', 'URL da Foto', 'text', 'basic', false, false, NULL, 25),
  ('latitude', 'Latitude', 'number', 'location', false, true, NULL, 26),
  ('longitude', 'Longitude', 'number', 'location', false, true, NULL, 27),
  ('fonte', 'Fonte', 'text', 'sync', false, true, NULL, 28),
  ('sync_status', 'Status Sync', 'text', 'sync', false, true, NULL, 29),
  ('sync_source', 'Origem Sync', 'text', 'sync', false, true, NULL, 30),
  ('last_sync_at', 'Última Sincronização', 'date', 'sync', false, true, 'formatDateBR', 31),
  ('date_modify', 'Data Modificação', 'date', 'dates', false, true, 'formatDateBR', 32),
  ('updated_at', 'Atualizado Em', 'date', 'dates', false, true, 'formatDateBR', 33)
ON CONFLICT (database_field) DO NOTHING;