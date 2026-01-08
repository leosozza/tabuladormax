-- Adicionar índices para melhorar performance das consultas de mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_bitrix_id_created 
ON public.whatsapp_messages(bitrix_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_created 
ON public.whatsapp_messages(phone_number, created_at DESC);

-- Atualizar RPC get_telemarketing_conversations para incluir conversation_id
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(integer, integer[], text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_telemarketing_conversations(
  p_operator_bitrix_id integer,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  lead_id bigint,
  bitrix_id text,
  lead_name text,
  phone_number text,
  photo_url text,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count bigint,
  window_open boolean,
  telemarketing_name text,
  conversation_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH lead_messages AS (
    SELECT 
      l.id as lead_id,
      l.id::text as bitrix_id,
      COALESCE(l.nome_modelo, l.name, 'Lead #' || l.id::text) as lead_name,
      COALESCE(
        NULLIF(REGEXP_REPLACE(l.celular_1, '\D', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(l.celular_2, '\D', '', 'g'), ''),
        wm.phone_number
      ) as phone_number,
      l.foto_lead as photo_url,
      t.name as telemarketing_name,
      l.bitrix_telemarketing_id
    FROM leads l
    LEFT JOIN agent_telemarketing_mapping t ON t.bitrix_telemarketing_id = l.bitrix_telemarketing_id
    LEFT JOIN LATERAL (
      SELECT m.phone_number 
      FROM whatsapp_messages m 
      WHERE m.bitrix_id = l.id::text 
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) wm ON true
    WHERE 
      CASE 
        WHEN p_team_operator_ids IS NOT NULL AND array_length(p_team_operator_ids, 1) > 0 THEN
          l.bitrix_telemarketing_id = ANY(p_team_operator_ids)
        ELSE
          l.bitrix_telemarketing_id = p_operator_bitrix_id
      END
  ),
  message_stats AS (
    SELECT 
      lm.lead_id,
      lm.bitrix_id,
      lm.lead_name,
      lm.phone_number,
      lm.photo_url,
      lm.telemarketing_name,
      MAX(m.created_at) as last_message_at,
      MAX(m.conversation_id) as conversation_id,
      (
        SELECT m2.content 
        FROM whatsapp_messages m2 
        WHERE (m2.bitrix_id = lm.bitrix_id OR m2.phone_number = lm.phone_number)
        ORDER BY m2.created_at DESC 
        LIMIT 1
      ) as last_message_preview,
      COUNT(*) FILTER (WHERE m.direction = 'inbound' AND m.read_at IS NULL) as unread_count,
      MAX(CASE WHEN m.direction = 'inbound' THEN m.created_at END) as last_inbound_at
    FROM lead_messages lm
    LEFT JOIN whatsapp_messages m ON (m.bitrix_id = lm.bitrix_id OR m.phone_number = lm.phone_number)
    WHERE lm.phone_number IS NOT NULL
    GROUP BY lm.lead_id, lm.bitrix_id, lm.lead_name, lm.phone_number, lm.photo_url, lm.telemarketing_name
    HAVING MAX(m.created_at) IS NOT NULL
  )
  SELECT 
    ms.lead_id,
    ms.bitrix_id,
    ms.lead_name,
    ms.phone_number,
    ms.photo_url,
    ms.last_message_at,
    ms.last_message_preview,
    ms.unread_count,
    (ms.last_inbound_at IS NOT NULL AND ms.last_inbound_at > NOW() - INTERVAL '24 hours') as window_open,
    ms.telemarketing_name,
    ms.conversation_id
  FROM message_stats ms
  WHERE (p_search IS NULL OR 
         ms.lead_name ILIKE '%' || p_search || '%' OR 
         ms.phone_number LIKE '%' || p_search || '%')
  ORDER BY ms.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;