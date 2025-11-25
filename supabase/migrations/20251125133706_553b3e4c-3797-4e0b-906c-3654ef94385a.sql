-- 1. Criar tabela bitrix_source_mapping
CREATE TABLE IF NOT EXISTS bitrix_source_mapping (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Popular com dados do bitrix_fields_cache
INSERT INTO bitrix_source_mapping (status_id, name)
SELECT 
  item->>'ID' as status_id,
  item->>'VALUE' as name
FROM bitrix_fields_cache, 
     jsonb_array_elements(list_items) as item
WHERE field_id = 'SOURCE_ID'
ON CONFLICT (status_id) DO NOTHING;

-- 2. Atualizar função normalize_fonte() com mapeamentos CORRETOS
CREATE OR REPLACE FUNCTION normalize_fonte(raw_fonte text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF raw_fonte IS NULL OR raw_fonte = '' THEN
    RETURN 'Sem Fonte';
  END IF;
  
  -- Mapeamentos diretos do Bitrix (CORRETOS!)
  RETURN CASE raw_fonte
    WHEN 'CALL' THEN 'Scouter - Fichas'
    WHEN 'WEBFORM' THEN 'Meta'
    WHEN 'CALLBACK' THEN 'Google'
    WHEN 'STORE' THEN 'Outros'
    WHEN 'RC_GENERATOR' THEN 'Site'
    WHEN 'BOOKING' THEN 'Agendamento on-line'
    WHEN 'REPEAT_SALE' THEN 'Vendas recorrentes'
    WHEN 'UC_YCY3DY' THEN 'Sem Fonte'
    WHEN 'UC_KLRLDV' THEN 'Instagram'
    WHEN 'UC_7UB0YH' THEN 'Facebook'
    WHEN 'UC_HZW6GM' THEN 'Telefone'
    WHEN 'UC_9CT3Z6' THEN 'Importação Maxsystem'
    WHEN 'UC_AFRLC7' THEN 'MaxSystem - Redes Sociais'
    WHEN 'UC_SJ3VW5' THEN 'Recepção'
    WHEN 'UC_HMANJS' THEN 'Whats Central atendimento'
    WHEN 'UC_U0XJ08' THEN 'Whatsapp'
    WHEN '30' THEN 'Instagram - Formulario de cadastro'
    WHEN '31' THEN 'Confirmação de Cadastro'
    WHEN '12|OPENLINE' THEN 'Pós Cadastro - Scouter'
    WHEN '12|WHATSAPP' THEN 'Whatsapp - Pós Cadastro - Scouter'
    WHEN '26|WHATSAPP' THEN 'Whatsapp - Grupo Ybrasil'
    WHEN '28|WHATSAPP' THEN 'Whatsapp - Requalificação de Lead'
    -- Se já vier com nome legível, manter
    ELSE raw_fonte
  END;
END;
$$;

-- 3. Atualizar dados históricos na coluna fonte
UPDATE leads SET fonte = 'Scouter - Fichas' WHERE fonte = 'CALL';
UPDATE leads SET fonte = 'Meta' WHERE fonte = 'WEBFORM';
UPDATE leads SET fonte = 'Google' WHERE fonte = 'CALLBACK';
UPDATE leads SET fonte = 'Outros' WHERE fonte = 'STORE';
UPDATE leads SET fonte = 'Site' WHERE fonte = 'RC_GENERATOR';
UPDATE leads SET fonte = 'Agendamento on-line' WHERE fonte = 'BOOKING';
UPDATE leads SET fonte = 'Vendas recorrentes' WHERE fonte = 'REPEAT_SALE';
UPDATE leads SET fonte = 'Sem Fonte' WHERE fonte = 'UC_YCY3DY';
UPDATE leads SET fonte = 'Instagram' WHERE fonte = 'UC_KLRLDV';
UPDATE leads SET fonte = 'Facebook' WHERE fonte = 'UC_7UB0YH';
UPDATE leads SET fonte = 'Telefone' WHERE fonte = 'UC_HZW6GM';
UPDATE leads SET fonte = 'Importação Maxsystem' WHERE fonte = 'UC_9CT3Z6';
UPDATE leads SET fonte = 'MaxSystem - Redes Sociais' WHERE fonte = 'UC_AFRLC7';
UPDATE leads SET fonte = 'Recepção' WHERE fonte = 'UC_SJ3VW5';
UPDATE leads SET fonte = 'Whats Central atendimento' WHERE fonte = 'UC_HMANJS';
UPDATE leads SET fonte = 'Whatsapp' WHERE fonte = 'UC_U0XJ08';
UPDATE leads SET fonte = 'Instagram - Formulario de cadastro' WHERE fonte = '30';
UPDATE leads SET fonte = 'Confirmação de Cadastro' WHERE fonte = '31';
UPDATE leads SET fonte = 'Pós Cadastro - Scouter' WHERE fonte = '12|OPENLINE';
UPDATE leads SET fonte = 'Whatsapp - Pós Cadastro - Scouter' WHERE fonte = '12|WHATSAPP';
UPDATE leads SET fonte = 'Whatsapp - Grupo Ybrasil' WHERE fonte = '26|WHATSAPP';
UPDATE leads SET fonte = 'Whatsapp - Requalificação de Lead' WHERE fonte = '28|WHATSAPP';

-- RLS para bitrix_source_mapping
ALTER TABLE bitrix_source_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar source mapping"
  ON bitrix_source_mapping
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Todos podem visualizar source mapping"
  ON bitrix_source_mapping
  FOR SELECT
  USING (true);