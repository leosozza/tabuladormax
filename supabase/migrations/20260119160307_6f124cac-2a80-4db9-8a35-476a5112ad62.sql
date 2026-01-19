-- =============================================
-- FASE 2: ÍNDICES OTIMIZADOS PARA WHATSAPP
-- =============================================

-- 2.1 Índice para agregações da função get_admin_whatsapp_conversations
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_bitrix_created 
ON whatsapp_messages(phone_number, bitrix_id, created_at DESC);

-- 2.2 Índice para filtrar mensagens inbound não lidas
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_unread 
ON whatsapp_messages(phone_number, bitrix_id, created_at DESC) 
WHERE direction = 'inbound' AND read_at IS NULL;

-- =============================================
-- FASE 3: DOCUMENTAR LEGADO CHATWOOT
-- =============================================

-- 3.1 Adicionar comentário explicativo na tabela chatwoot_contacts
COMMENT ON TABLE chatwoot_contacts IS 
'LEGADO: Esta tabela armazena mapeamento telefone/bitrix_id para WhatsApp. 
Nome original mantido para compatibilidade - planejado renomear para whatsapp_contacts.
Usado por: gupshup-webhook, gupshup-send-message, register-external-message, flows-executor.
Criada quando usávamos Chatwoot, agora integrado diretamente com Gupshup.';