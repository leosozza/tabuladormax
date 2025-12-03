-- Adicionar campo para rastrear última mensagem do cliente (para janela de 24h)
ALTER TABLE chatwoot_contacts
ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;

COMMENT ON COLUMN chatwoot_contacts.last_customer_message_at IS 'Última mensagem RECEBIDA do cliente (para cálculo da janela de 24h da Meta)';