-- Adicionar coluna trigger_id na tabela button_config para associar botões a gatilhos de flow
ALTER TABLE button_config 
ADD COLUMN trigger_id UUID REFERENCES flow_triggers(id) ON DELETE SET NULL;