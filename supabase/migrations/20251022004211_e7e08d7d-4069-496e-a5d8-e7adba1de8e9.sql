-- Criar tabela para mapeamento de campos Bitrix → TabuladorMax
CREATE TABLE bitrix_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_field TEXT NOT NULL,
  tabuladormax_field TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  transform_function TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar mapeamentos de forma eficiente
CREATE INDEX idx_bitrix_mappings_tabuladormax 
ON bitrix_field_mappings(tabuladormax_field, priority);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bitrix_field_mappings_updated_at
  BEFORE UPDATE ON bitrix_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE bitrix_field_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins and managers can manage bitrix mappings"
ON bitrix_field_mappings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "All users can view bitrix mappings"
ON bitrix_field_mappings FOR SELECT
TO authenticated
USING (true);

-- Inserir mapeamentos padrão (replicando comportamento atual)
INSERT INTO bitrix_field_mappings (bitrix_field, tabuladormax_field, priority, transform_function) VALUES
  ('NAME', 'name', 0, NULL),
  ('TITLE', 'name', 1, NULL),
  ('UF_CRM_1622827435', 'age', 0, 'toNumber'),
  ('UF_CRM_1622827589', 'address', 0, NULL),
  ('ADDRESS', 'address', 1, NULL),
  ('UF_CRM_1726088022654', 'photo_url', 0, NULL),
  ('UF_CRM_1622827519', 'responsible', 0, NULL),
  ('ASSIGNED_BY_ID', 'responsible', 1, NULL),
  ('UF_CRM_1622827473', 'scouter', 0, NULL),
  ('UF_CRM_1729775837', 'telefone_casa', 0, NULL),
  ('PHONE', 'telefone_casa', 1, NULL),
  ('UF_CRM_1729775864', 'telefone_trabalho', 0, NULL),
  ('UF_CRM_1729775877', 'celular', 0, NULL),
  ('UF_CRM_1622828542', 'data_agendamento', 0, 'toDate'),
  ('UF_CRM_1727374750', 'horario_agendamento', 0, NULL),
  ('UF_CRM_1729775954', 'local_abordagem', 0, NULL),
  ('UF_CRM_1729776032', 'fonte', 0, NULL),
  ('SOURCE_ID', 'fonte', 1, NULL),
  ('UF_CRM_1729776110', 'presenca_confirmada', 0, 'toBoolean'),
  ('UF_CRM_1729776145', 'compareceu', 0, 'toBoolean'),
  ('STATUS_ID', 'etapa', 0, NULL),
  ('UF_CRM_1729776195', 'cadastro_existe_foto', 0, 'toBoolean'),
  ('DATE_CREATE', 'criado', 0, 'toTimestamp'),
  ('DATE_MODIFY', 'date_modify', 0, 'toTimestamp');