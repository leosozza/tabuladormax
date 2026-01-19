-- Índice otimizado para queries do portal telemarketing
-- Acelera busca por bitrix_telemarketing_id ordenado por updated_at
CREATE INDEX IF NOT EXISTS idx_leads_telemarketing_updated
ON leads (bitrix_telemarketing_id, updated_at DESC)
WHERE bitrix_telemarketing_id IS NOT NULL;

-- Índice para busca de mensagens WhatsApp por bitrix_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_bitrix_id
ON whatsapp_messages (bitrix_id, created_at DESC)
WHERE bitrix_id IS NOT NULL;