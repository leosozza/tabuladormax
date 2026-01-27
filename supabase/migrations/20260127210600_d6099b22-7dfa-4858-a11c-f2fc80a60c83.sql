-- Drop the existing view first
DROP MATERIALIZED VIEW IF EXISTS mv_whatsapp_conversation_stats;

-- Recreate with attendance status support
CREATE MATERIALIZED VIEW mv_whatsapp_conversation_stats AS
WITH last_90_days AS (
  SELECT DISTINCT phone_number, bitrix_id
  FROM whatsapp_messages
  WHERE created_at >= NOW() - INTERVAL '90 days'
    AND phone_number IS NOT NULL
),
message_stats AS (
  SELECT 
    m.phone_number,
    m.bitrix_id,
    MAX(CASE WHEN m.direction = 'inbound' THEN m.created_at END) as last_customer_message_at,
    MAX(CASE WHEN m.direction = 'outbound' THEN m.created_at END) as last_operator_message_at,
    MAX(CASE WHEN m.direction = 'outbound' AND m.sent_by = 'operador' THEN m.created_at END) as last_human_operator_message_at,
    MAX(m.created_at) as last_message_at,
    COUNT(*) FILTER (WHERE m.read_at IS NULL AND m.direction = 'inbound') as unread_count,
    COUNT(*) as total_messages,
    MAX(m.created_at) FILTER (WHERE m.direction = 'outbound') as last_outbound_at,
    MAX(m.created_at) FILTER (WHERE m.direction = 'inbound') as last_inbound_at
  FROM whatsapp_messages m
  JOIN last_90_days l ON m.phone_number = l.phone_number 
    AND (m.bitrix_id = l.bitrix_id OR (m.bitrix_id IS NULL AND l.bitrix_id IS NULL))
  WHERE m.created_at >= NOW() - INTERVAL '90 days'
  GROUP BY m.phone_number, m.bitrix_id
),
closures AS (
  SELECT phone_number, 1 as is_closed
  FROM whatsapp_conversation_closures
  WHERE reopened_at IS NULL
)
SELECT 
  ms.phone_number,
  ms.bitrix_id,
  ms.last_customer_message_at,
  ms.last_operator_message_at,
  ms.last_message_at,
  ms.unread_count,
  ms.total_messages,
  CASE 
    WHEN ms.last_human_operator_message_at IS NOT NULL 
         AND (ms.last_inbound_at IS NULL OR ms.last_human_operator_message_at > ms.last_inbound_at) THEN 'in_progress'
    WHEN ms.last_outbound_at IS NULL THEN 'never'
    WHEN ms.last_inbound_at IS NULL THEN 'replied'
    WHEN ms.last_outbound_at > ms.last_inbound_at THEN 'replied'
    ELSE 'waiting'
  END as response_status,
  CASE 
    WHEN ms.last_customer_message_at >= NOW() - INTERVAL '24 hours' THEN true
    ELSE false
  END as is_window_open,
  COALESCE(c.is_closed, 0) = 1 as is_closed
FROM message_stats ms
LEFT JOIN closures c ON c.phone_number = ms.phone_number;

CREATE UNIQUE INDEX ON mv_whatsapp_conversation_stats (phone_number, bitrix_id);
CREATE INDEX ON mv_whatsapp_conversation_stats (response_status);
CREATE INDEX ON mv_whatsapp_conversation_stats (is_window_open);
CREATE INDEX ON mv_whatsapp_conversation_stats (is_closed);

GRANT SELECT ON mv_whatsapp_conversation_stats TO authenticated;
GRANT SELECT ON mv_whatsapp_conversation_stats TO anon;

REFRESH MATERIALIZED VIEW mv_whatsapp_conversation_stats;