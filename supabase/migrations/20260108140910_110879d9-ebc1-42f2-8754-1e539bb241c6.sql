-- RPC para operadores buscarem mensagens de WhatsApp dos seus leads
-- Bypass da RLS que depende de auth.uid()

CREATE OR REPLACE FUNCTION public.get_operator_whatsapp_messages(
  p_operator_bitrix_id INTEGER,
  p_phone_numbers TEXT[]
)
RETURNS TABLE (
  phone_number TEXT,
  total_messages BIGINT,
  last_message_at TIMESTAMPTZ,
  last_message_content TEXT,
  last_message_direction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH lead_phones AS (
    -- Buscar leads do operador que têm os telefones especificados
    SELECT DISTINCT l.id, l.phone
    FROM leads l
    WHERE l.bitrix_telemarketing_id = p_operator_bitrix_id
      AND l.phone = ANY(p_phone_numbers)
  ),
  message_stats AS (
    SELECT 
      wm.phone_number,
      COUNT(*) as msg_count,
      MAX(wm.created_at) as last_msg_at
    FROM whatsapp_messages wm
    INNER JOIN lead_phones lp ON wm.phone_number = lp.phone
    GROUP BY wm.phone_number
  ),
  last_messages AS (
    SELECT DISTINCT ON (wm.phone_number)
      wm.phone_number,
      wm.content,
      wm.direction
    FROM whatsapp_messages wm
    INNER JOIN lead_phones lp ON wm.phone_number = lp.phone
    ORDER BY wm.phone_number, wm.created_at DESC
  )
  SELECT 
    ms.phone_number,
    ms.msg_count as total_messages,
    ms.last_msg_at as last_message_at,
    lm.content as last_message_content,
    lm.direction as last_message_direction
  FROM message_stats ms
  LEFT JOIN last_messages lm ON ms.phone_number = lm.phone_number;
END;
$$;

-- Grant execute para usuários autenticados e anon (operadores usam access_key)
GRANT EXECUTE ON FUNCTION public.get_operator_whatsapp_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_operator_whatsapp_messages TO anon;