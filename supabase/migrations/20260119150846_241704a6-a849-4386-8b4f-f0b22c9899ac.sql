-- Fix count_admin_whatsapp_conversations so the admin WhatsApp list can load totals without errors

DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      wm.phone_number,
      wm.bitrix_id,
      MAX(wm.created_at) FILTER (WHERE wm.direction = 'inbound') AS last_customer_message_at
    FROM public.whatsapp_messages wm
    GROUP BY wm.phone_number, wm.bitrix_id
  ),
  last_message AS (
    SELECT DISTINCT ON (wm.phone_number, wm.bitrix_id)
      wm.phone_number,
      wm.bitrix_id,
      wm.direction,
      wm.created_at
    FROM public.whatsapp_messages wm
    ORDER BY wm.phone_number, wm.bitrix_id, wm.created_at DESC
  )
  SELECT COUNT(*)::BIGINT
  FROM stats s
  LEFT JOIN last_message lm
    ON lm.phone_number = s.phone_number AND lm.bitrix_id IS NOT DISTINCT FROM s.bitrix_id
  LEFT JOIN public.leads l
    ON l.id = (CASE WHEN s.bitrix_id ~ '^\d+$' THEN s.bitrix_id::BIGINT ELSE NULL END)
  WHERE
    (
      p_search IS NULL OR p_search = '' OR
      s.phone_number ILIKE '%' || p_search || '%' OR
      COALESCE(l.name, '') ILIKE '%' || p_search || '%' OR
      COALESCE(s.bitrix_id, '') ILIKE '%' || p_search || '%'
    )
    AND (
      p_window_filter IS NULL OR p_window_filter = 'all' OR
      (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours') OR
      (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours'))
    )
    AND (
      p_response_filter IS NULL OR p_response_filter = 'all' OR
      (p_response_filter = 'waiting' AND s.last_customer_message_at IS NOT NULL AND lm.direction = 'inbound') OR
      (p_response_filter = 'replied' AND s.last_customer_message_at IS NOT NULL AND lm.direction = 'outbound') OR
      (p_response_filter = 'never' AND s.last_customer_message_at IS NULL)
    )
    AND (
      p_etapa_filter IS NULL OR p_etapa_filter = '' OR l.etapa = p_etapa_filter
    );
$$;