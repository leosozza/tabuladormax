-- Corrigir RPC - usar read_at ao invés de is_read
DROP FUNCTION IF EXISTS public.get_telemarketing_conversations(INTEGER, INTEGER[], TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.get_telemarketing_conversations(
  p_operator_bitrix_id INTEGER,
  p_team_operator_ids INTEGER[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (
  lead_id INTEGER,
  bitrix_id TEXT,
  lead_name TEXT,
  phone_number TEXT,
  photo_url TEXT,
  telemarketing_name TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count BIGINT,
  window_open BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_ids INTEGER[];
BEGIN
  IF p_team_operator_ids IS NOT NULL AND array_length(p_team_operator_ids, 1) > 0 THEN
    v_operator_ids := p_team_operator_ids;
  ELSE
    v_operator_ids := ARRAY[p_operator_bitrix_id];
  END IF;

  RETURN QUERY
  WITH lead_data AS (
    SELECT 
      l.id AS lead_id,
      l.id::text AS bitrix_id,
      COALESCE(l.nome_modelo, l.name, 'Lead ' || l.id) AS lead_name,
      COALESCE(
        NULLIF(l.celular, ''),
        NULLIF(l.telefone_casa, ''),
        NULLIF(l.telefone_trabalho, ''),
        NULLIF(l.phone_normalized, '')
      ) AS phone_number,
      l.photo_url AS photo_url,
      l.bitrix_telemarketing_id,
      t.name AS telemarketing_name
    FROM leads l
    LEFT JOIN telemarketing_operators t ON t.bitrix_id = l.bitrix_telemarketing_id
    WHERE l.bitrix_telemarketing_id = ANY(v_operator_ids)
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR l.nome_modelo ILIKE '%' || p_search || '%'
        OR l.name ILIKE '%' || p_search || '%'
        OR l.celular ILIKE '%' || p_search || '%'
      )
  ),
  phone_fallback AS (
    SELECT DISTINCT ON (wm.bitrix_id)
      wm.bitrix_id,
      wm.phone_number
    FROM whatsapp_messages wm
    WHERE wm.bitrix_id IN (SELECT ld.bitrix_id FROM lead_data ld WHERE ld.phone_number IS NULL)
    ORDER BY wm.bitrix_id, wm.created_at DESC
  ),
  leads_with_phones AS (
    SELECT 
      ld.lead_id,
      ld.bitrix_id,
      ld.lead_name,
      COALESCE(ld.phone_number, pf.phone_number) AS phone_number,
      ld.photo_url,
      ld.telemarketing_name
    FROM lead_data ld
    LEFT JOIN phone_fallback pf ON pf.bitrix_id = ld.bitrix_id
    WHERE ld.phone_number IS NOT NULL OR pf.phone_number IS NOT NULL
  ),
  message_stats AS (
    SELECT 
      wm.bitrix_id,
      MAX(wm.created_at) AS last_message_at,
      (SELECT content FROM whatsapp_messages wm2 
       WHERE wm2.bitrix_id = wm.bitrix_id 
       ORDER BY wm2.created_at DESC LIMIT 1) AS last_message_preview,
      COUNT(*) FILTER (WHERE wm.direction = 'inbound' AND wm.read_at IS NULL) AS unread_count,
      BOOL_OR(wm.created_at > NOW() - INTERVAL '24 hours' AND wm.direction = 'inbound') AS window_open
    FROM whatsapp_messages wm
    WHERE wm.bitrix_id IN (SELECT lwp.bitrix_id FROM leads_with_phones lwp)
    GROUP BY wm.bitrix_id
  )
  SELECT 
    lwp.lead_id,
    lwp.bitrix_id,
    lwp.lead_name,
    lwp.phone_number,
    lwp.photo_url,
    lwp.telemarketing_name,
    ms.last_message_at,
    LEFT(ms.last_message_preview, 100) AS last_message_preview,
    COALESCE(ms.unread_count, 0) AS unread_count,
    COALESCE(ms.window_open, false) AS window_open
  FROM leads_with_phones lwp
  LEFT JOIN message_stats ms ON ms.bitrix_id = lwp.bitrix_id
  ORDER BY ms.last_message_at DESC NULLS LAST, lwp.lead_id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_telemarketing_conversations TO authenticated, anon;