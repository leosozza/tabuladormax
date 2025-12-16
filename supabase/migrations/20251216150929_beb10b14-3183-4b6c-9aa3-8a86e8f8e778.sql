-- RPC para estatísticas de conversas WhatsApp
CREATE OR REPLACE FUNCTION public.get_whatsapp_conversation_stats(
  p_bitrix_ids TEXT[] DEFAULT NULL,
  p_phone_numbers TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  identifier TEXT,
  identifier_type TEXT,
  total_messages BIGINT,
  unread_messages BIGINT,
  last_message_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(wm.bitrix_id, wm.phone_number) as identifier,
    CASE 
      WHEN wm.bitrix_id IS NOT NULL THEN 'bitrix_id'
      ELSE 'phone_number'
    END as identifier_type,
    COUNT(*)::BIGINT as total_messages,
    COUNT(*) FILTER (WHERE wm.direction = 'inbound' AND wm.status != 'read')::BIGINT as unread_messages,
    MAX(wm.created_at) as last_message_at,
    MAX(wm.created_at) FILTER (WHERE wm.direction = 'inbound') as last_inbound_at,
    MAX(wm.created_at) FILTER (WHERE wm.direction = 'outbound') as last_outbound_at
  FROM whatsapp_messages wm
  WHERE 
    (p_bitrix_ids IS NULL OR wm.bitrix_id = ANY(p_bitrix_ids))
    AND (p_phone_numbers IS NULL OR wm.phone_number = ANY(p_phone_numbers))
  GROUP BY COALESCE(wm.bitrix_id, wm.phone_number),
    CASE WHEN wm.bitrix_id IS NOT NULL THEN 'bitrix_id' ELSE 'phone_number' END;
END;
$$;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_bitrix_id ON whatsapp_messages(bitrix_id) WHERE bitrix_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction_status ON whatsapp_messages(direction, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);