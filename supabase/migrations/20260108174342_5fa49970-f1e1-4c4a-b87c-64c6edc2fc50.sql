-- Índices para acelerar buscas de mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_created 
ON public.whatsapp_messages (phone_number, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_bitrix_id 
ON public.whatsapp_messages (bitrix_id);

-- RPC para retornar estatísticas agregadas por telefone (evita timeout)
CREATE OR REPLACE FUNCTION get_whatsapp_message_stats(p_phone_numbers text[])
RETURNS TABLE (
  phone_number text,
  last_message_at timestamptz,
  last_message_content text,
  last_message_direction text,
  last_customer_message_at timestamptz,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (wm.phone_number)
      wm.phone_number,
      wm.created_at as last_message_at,
      wm.content as last_message_content,
      wm.direction as last_message_direction
    FROM whatsapp_messages wm
    WHERE wm.phone_number = ANY(p_phone_numbers)
    ORDER BY wm.phone_number, wm.created_at DESC
  ),
  customer_messages AS (
    SELECT DISTINCT ON (wm.phone_number)
      wm.phone_number,
      wm.created_at as last_customer_message_at
    FROM whatsapp_messages wm
    WHERE wm.phone_number = ANY(p_phone_numbers)
      AND wm.direction = 'inbound'
    ORDER BY wm.phone_number, wm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      wm.phone_number,
      COUNT(*) as unread_count
    FROM whatsapp_messages wm
    WHERE wm.phone_number = ANY(p_phone_numbers)
      AND wm.direction = 'inbound'
      AND (wm.status IS NULL OR wm.status != 'read')
    GROUP BY wm.phone_number
  )
  SELECT 
    lm.phone_number,
    lm.last_message_at,
    lm.last_message_content,
    lm.last_message_direction,
    cm.last_customer_message_at,
    COALESCE(uc.unread_count, 0) as unread_count
  FROM latest_messages lm
  LEFT JOIN customer_messages cm ON lm.phone_number = cm.phone_number
  LEFT JOIN unread_counts uc ON lm.phone_number = uc.phone_number;
END;
$$;