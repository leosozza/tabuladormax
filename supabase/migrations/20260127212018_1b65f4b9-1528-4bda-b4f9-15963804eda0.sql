-- Fix mv_whatsapp_conversation_stats: restore last_message_preview and last_message_direction columns
-- that were accidentally removed in the previous migration

-- Drop existing materialized view and indexes
DROP MATERIALIZED VIEW IF EXISTS mv_whatsapp_conversation_stats CASCADE;

-- Recreate with all required columns including preview and direction
CREATE MATERIALIZED VIEW mv_whatsapp_conversation_stats AS
WITH message_stats AS (
  SELECT
    phone_number,
    bitrix_id,
    MAX(created_at) AS last_message_at,
    MAX(CASE WHEN direction = 'inbound' THEN created_at END) AS last_inbound_at,
    MAX(CASE WHEN direction = 'outbound' THEN created_at END) AS last_outbound_at,
    MAX(CASE WHEN direction = 'outbound' AND sent_by = 'operador' THEN created_at END) AS last_human_operator_message_at,
    COUNT(*) FILTER (WHERE direction = 'inbound' AND read_at IS NULL) AS unread_count,
    COUNT(*) AS total_messages,
    -- Get the latest message preview using array_agg ordered by created_at DESC
    (array_agg(
      COALESCE(
        NULLIF(LEFT(content, 100), ''),
        CASE 
          WHEN message_type = 'image' THEN '[Imagem]'
          WHEN message_type = 'audio' THEN '[Áudio]'
          WHEN message_type = 'video' THEN '[Vídeo]'
          WHEN message_type = 'document' THEN '[Documento]'
          WHEN message_type = 'sticker' THEN '[Sticker]'
          WHEN message_type = 'location' THEN '[Localização]'
          WHEN message_type = 'contact' THEN '[Contato]'
          WHEN template_name IS NOT NULL THEN '[Template enviado]'
          ELSE '[Mídia]'
        END
      ) ORDER BY created_at DESC
    ))[1] AS last_message_preview,
    -- Get the latest message direction
    (array_agg(direction ORDER BY created_at DESC))[1] AS last_message_direction
  FROM whatsapp_messages
  WHERE created_at >= NOW() - INTERVAL '90 days'
  GROUP BY phone_number, bitrix_id
),
closure_status AS (
  SELECT DISTINCT ON (phone_number)
    phone_number,
    CASE WHEN reopened_at IS NULL THEN TRUE ELSE FALSE END AS is_closed
  FROM whatsapp_conversation_closures
  ORDER BY phone_number, closed_at DESC
)
SELECT
  ms.phone_number,
  ms.bitrix_id,
  ms.last_message_at,
  ms.last_inbound_at AS last_customer_message_at,
  ms.last_outbound_at AS last_operator_message_at,
  ms.unread_count,
  ms.total_messages,
  ms.last_message_preview,
  ms.last_message_direction,
  CASE 
    -- In progress: human operator responded more recently than last customer message
    WHEN ms.last_human_operator_message_at IS NOT NULL 
         AND (ms.last_inbound_at IS NULL OR ms.last_human_operator_message_at > ms.last_inbound_at) 
    THEN 'in_progress'
    -- Waiting: customer sent message after last outbound
    WHEN ms.last_inbound_at IS NOT NULL 
         AND (ms.last_outbound_at IS NULL OR ms.last_inbound_at > ms.last_outbound_at)
    THEN 'waiting'
    -- Never: no outbound messages at all
    WHEN ms.last_outbound_at IS NULL 
    THEN 'never'
    -- Replied: has outbound after inbound
    ELSE 'replied'
  END AS response_status,
  -- Window is open if last customer message was within 24 hours
  CASE 
    WHEN ms.last_inbound_at IS NOT NULL 
         AND ms.last_inbound_at >= NOW() - INTERVAL '24 hours'
    THEN TRUE 
    ELSE FALSE 
  END AS is_window_open,
  COALESCE(cs.is_closed, FALSE) AS is_closed
FROM message_stats ms
LEFT JOIN closure_status cs ON cs.phone_number = ms.phone_number;

-- Create indexes for performance
CREATE UNIQUE INDEX idx_mv_whatsapp_stats_phone_bitrix 
  ON mv_whatsapp_conversation_stats (phone_number, COALESCE(bitrix_id, ''));

CREATE INDEX idx_mv_whatsapp_stats_response_status 
  ON mv_whatsapp_conversation_stats (response_status);

CREATE INDEX idx_mv_whatsapp_stats_is_window_open 
  ON mv_whatsapp_conversation_stats (is_window_open);

CREATE INDEX idx_mv_whatsapp_stats_is_closed 
  ON mv_whatsapp_conversation_stats (is_closed);

CREATE INDEX idx_mv_whatsapp_stats_last_message_at 
  ON mv_whatsapp_conversation_stats (last_message_at DESC);

-- Grant permissions
GRANT SELECT ON mv_whatsapp_conversation_stats TO authenticated;
GRANT SELECT ON mv_whatsapp_conversation_stats TO anon;

-- Refresh the view with data
REFRESH MATERIALIZED VIEW mv_whatsapp_conversation_stats;