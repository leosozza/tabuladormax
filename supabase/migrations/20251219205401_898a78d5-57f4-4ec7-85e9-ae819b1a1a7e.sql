-- Remove a constraint antiga que só permite 'simple' e 'schedule'
ALTER TABLE button_config DROP CONSTRAINT IF EXISTS button_config_action_type_check;

-- Adiciona nova constraint com todos os 8 tipos de ação válidos
ALTER TABLE button_config ADD CONSTRAINT button_config_action_type_check 
CHECK (action_type = ANY (ARRAY[
  'simple'::text, 
  'schedule'::text, 
  'text'::text, 
  'date'::text, 
  'datetime'::text, 
  'list'::text, 
  'number'::text, 
  'trigger_flow'::text
]));