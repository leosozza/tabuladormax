-- FASE 1.1: Adicionar colunas para IDs do Chatwoot
ALTER TABLE leads 
ADD COLUMN conversation_id INTEGER,
ADD COLUMN contact_id INTEGER;

-- Criar índices para performance
CREATE INDEX idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX idx_leads_contact_id ON leads(contact_id);

-- Comentários para documentação
COMMENT ON COLUMN leads.conversation_id IS 'ID da conversa no Chatwoot (do Bitrix UF_CRM_1759783630582)';
COMMENT ON COLUMN leads.contact_id IS 'ID do contato no Chatwoot (do Bitrix UF_CRM_1759783643206)';

-- FASE 1.2: Migrar dados existentes de chatwoot_contacts para leads
UPDATE leads
SET 
  conversation_id = cc.conversation_id,
  contact_id = cc.contact_id
FROM (
  SELECT DISTINCT ON (bitrix_id)
    bitrix_id,
    conversation_id,
    contact_id
  FROM chatwoot_contacts
  WHERE conversation_id IS NOT NULL
  ORDER BY bitrix_id, updated_at DESC
) cc
WHERE leads.id::text = cc.bitrix_id
  AND (leads.conversation_id IS NULL OR leads.contact_id IS NULL);