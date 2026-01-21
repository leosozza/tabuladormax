-- Remover constraint atual
ALTER TABLE whatsapp_messages 
DROP CONSTRAINT IF EXISTS whatsapp_messages_sent_by_check;

-- Adicionar constraint com valor 'flow_executor' incluído
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_sent_by_check 
CHECK (sent_by = ANY (ARRAY[
  'bitrix'::text, 
  'tabulador'::text, 
  'operador'::text, 
  'gupshup'::text, 
  'bitrix_automation'::text,
  'flow_executor'::text
]));