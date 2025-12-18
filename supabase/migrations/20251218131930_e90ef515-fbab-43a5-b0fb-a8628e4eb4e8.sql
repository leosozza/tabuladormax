-- Remover constraint antiga
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_sent_by_check;

-- Criar nova constraint incluindo 'bitrix_automation'
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_sent_by_check 
CHECK (sent_by IN ('bitrix', 'tabulador', 'operador', 'gupshup', 'bitrix_automation'));