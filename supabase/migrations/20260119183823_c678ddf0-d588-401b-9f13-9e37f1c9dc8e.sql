-- =====================================================
-- FIX: Eliminar overload de RPCs do WhatsApp Admin
-- =====================================================

-- 1. Remover TODAS as versões existentes das funções
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text);

-- 2. Recriar função única: get_admin_whatsapp_conversations
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL
)
RETURNS TABLE (
  phone_number text,
  bitrix_id text,
  lead_name text,
  etapa text,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_direction text,
  unread_count bigint,
  is_window_open boolean,
  window_expires_at timestamptz,
  last_customer_message_at timestamptz,
  response_status text,
  last_operator_name text,
  last_operator_photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      s.phone_number,
      s.bitrix_id,
      s.last_message_at,
      s.last_message_preview,
      s.last_message_direction,
      s.unread_count,
      s.last_customer_message_at,
      s.response_status,
      -- Calcular janela de 24h
      CASE 
        WHEN s.last_customer_message_at IS NOT NULL 
             AND s.last_customer_message_at > NOW() - INTERVAL '24 hours'
        THEN true
        ELSE false
      END AS is_window_open,
      CASE 
        WHEN s.last_customer_message_at IS NOT NULL 
             AND s.last_customer_message_at > NOW() - INTERVAL '24 hours'
        THEN s.last_customer_message_at + INTERVAL '24 hours'
        ELSE NULL
      END AS window_expires_at
    FROM mv_whatsapp_conversation_stats s
  )
  SELECT 
    stats.phone_number,
    stats.bitrix_id,
    COALESCE(l.name, stats.phone_number) AS lead_name,
    l.etapa,
    stats.last_message_at,
    stats.last_message_preview,
    stats.last_message_direction,
    stats.unread_count,
    stats.is_window_open,
    stats.window_expires_at,
    stats.last_customer_message_at,
    stats.response_status,
    atm.bitrix_telemarketing_name AS last_operator_name,
    NULL::text AS last_operator_photo_url
  FROM stats
  LEFT JOIN leads l ON (
    stats.bitrix_id IS NOT NULL 
    AND stats.bitrix_id ~ '^\d+$' 
    AND stats.bitrix_id::bigint = l.id
  )
  LEFT JOIN agent_telemarketing_mapping atm ON l.bitrix_telemarketing_id = atm.bitrix_telemarketing_id
  WHERE 
    -- Filtro de busca
    (p_search IS NULL OR p_search = '' OR 
      stats.phone_number ILIKE '%' || p_search || '%' OR
      COALESCE(l.name, '') ILIKE '%' || p_search || '%' OR
      COALESCE(stats.bitrix_id, '') ILIKE '%' || p_search || '%'
    )
    -- Filtro de janela
    AND (p_window_filter IS NULL OR p_window_filter = 'all' OR
      (p_window_filter = 'open' AND stats.is_window_open = true) OR
      (p_window_filter = 'closed' AND stats.is_window_open = false)
    )
    -- Filtro de resposta
    AND (p_response_filter IS NULL OR p_response_filter = 'all' OR
      stats.response_status = p_response_filter
    )
    -- Filtro de etapa
    AND (p_etapa_filter IS NULL OR p_etapa_filter = 'all' OR p_etapa_filter = '' OR
      l.etapa = p_etapa_filter
    )
  ORDER BY stats.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3. Recriar função única: count_admin_whatsapp_conversations
CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count bigint;
BEGIN
  WITH stats AS (
    SELECT 
      s.phone_number,
      s.bitrix_id,
      s.last_customer_message_at,
      s.response_status,
      CASE 
        WHEN s.last_customer_message_at IS NOT NULL 
             AND s.last_customer_message_at > NOW() - INTERVAL '24 hours'
        THEN true
        ELSE false
      END AS is_window_open
    FROM mv_whatsapp_conversation_stats s
  )
  SELECT COUNT(*)
  INTO total_count
  FROM stats
  LEFT JOIN leads l ON (
    stats.bitrix_id IS NOT NULL 
    AND stats.bitrix_id ~ '^\d+$' 
    AND stats.bitrix_id::bigint = l.id
  )
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      stats.phone_number ILIKE '%' || p_search || '%' OR
      COALESCE(l.name, '') ILIKE '%' || p_search || '%' OR
      COALESCE(stats.bitrix_id, '') ILIKE '%' || p_search || '%'
    )
    AND (p_window_filter IS NULL OR p_window_filter = 'all' OR
      (p_window_filter = 'open' AND stats.is_window_open = true) OR
      (p_window_filter = 'closed' AND stats.is_window_open = false)
    )
    AND (p_response_filter IS NULL OR p_response_filter = 'all' OR
      stats.response_status = p_response_filter
    )
    AND (p_etapa_filter IS NULL OR p_etapa_filter = 'all' OR p_etapa_filter = '' OR
      l.etapa = p_etapa_filter
    );
  
  RETURN total_count;
END;
$$;

-- 4. Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_admin_whatsapp_conversations(text, text, text, text) TO authenticated;