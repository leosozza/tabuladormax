-- Criar tabela para configurações de mapeamento de campos
CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  supabase_field TEXT NOT NULL,
  legacy_aliases JSONB NOT NULL DEFAULT '[]',
  data_type TEXT NOT NULL,
  transform_function TEXT,
  is_required BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, supabase_field)
);

-- RLS: Qualquer um pode ler, apenas admins podem editar
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mappings" 
  ON field_mappings FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage mappings" 
  ON field_mappings FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir mapeamentos padrão para fichas
INSERT INTO field_mappings (entity_type, supabase_field, legacy_aliases, data_type, transform_function, is_required, description) VALUES
('fichas', 'projeto', '["Projetos Comerciais", "Projetos Cormeciais", "Projetos", "Projeto", "projetos"]', 'text', NULL, false, 'Nome do projeto comercial associado'),
('fichas', 'scouter', '["Gestão do Scouter", "Gestão de Scouter", "Scouter", "Nome Scouter"]', 'text', NULL, false, 'Nome do scouter responsável'),
('fichas', 'criado', '["Data_criacao_Ficha", "Data", "Criado", "Data de Criação", "Data Criação"]', 'date', 'parseDate', false, 'Data de criação da ficha'),
('fichas', 'valor_ficha', '["Valor por Fichas", "Valor Ficha", "Valor_ficha", "R$/Ficha", "Valor da Ficha", "Valor por Ficha", "valor"]', 'number', 'parseBRL', false, 'Valor monetário da ficha'),
('fichas', 'latitude', '["lat", "Latitude", "LAT"]', 'number', 'parseNumber', false, 'Coordenada de latitude'),
('fichas', 'longitude', '["lng", "lon", "Longitude", "LNG", "LON"]', 'number', 'parseNumber', false, 'Coordenada de longitude'),
('fichas', 'nome', '["Nome", "Nome Completo", "Nome do Candidato"]', 'text', NULL, true, 'Nome do candidato'),
('fichas', 'telefone', '["Telefone", "Tel", "Celular", "Whatsapp"]', 'text', NULL, false, 'Telefone de contato'),
('fichas', 'email', '["Email", "E-mail", "e-mail"]', 'text', NULL, false, 'Email de contato'),
('fichas', 'etapa', '["Etapa", "Etapa Funil", "Etapafunil"]', 'text', NULL, false, 'Etapa do funil de vendas'),
('fichas', 'ficha_confirmada', '["Ficha Confirmada", "Confirmada", "Status Confirmação"]', 'text', NULL, false, 'Status de confirmação da ficha'),
('fichas', 'foto', '["Foto", "URL Foto", "Link Foto"]', 'text', NULL, false, 'URL da foto do candidato'),
('fichas', 'cadastro_existe_foto', '["Cadastro Existe Foto", "Tem Foto", "tem_foto"]', 'text', NULL, false, 'Indica se existe foto cadastrada'),
('fichas', 'compareceu', '["Compareceu", "Comparecimento"]', 'text', NULL, false, 'Status de comparecimento'),
('fichas', 'agendado', '["Agendado", "Qdoagendou", "qdoagendou"]', 'text', NULL, false, 'Status de agendamento'),
('fichas', 'tabulacao', '["Tabulação", "tabulacao", "Tabulacao", "Funilfichas", "funilfichas"]', 'text', NULL, false, 'Status de tabulação do telemarketing'),
('fichas', 'supervisor', '["Supervisor do Scouter", "Supervisor"]', 'text', NULL, false, 'Supervisor responsável'),
('fichas', 'idade', '["Idade"]', 'text', NULL, false, 'Idade do candidato'),
('fichas', 'local_da_abordagem', '["Local da Abordagem", "Local Abordagem", "Localização"]', 'text', NULL, false, 'Local onde foi feita a abordagem'),
('fichas', 'confirmado', '["Confirmado"]', 'text', NULL, false, 'Status de confirmação');