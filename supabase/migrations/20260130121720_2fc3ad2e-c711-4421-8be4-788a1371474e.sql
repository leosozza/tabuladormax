-- =========================================================
-- CLEANUP: Remove all overloaded versions of admin WhatsApp RPCs
-- =========================================================

-- Drop ALL existing overloads of get_admin_whatsapp_conversations
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text, text, text[]);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text, text, text[], uuid);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text, text, uuid[], uuid);

-- Drop ALL existing overloads of count_admin_whatsapp_conversations
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text, text, text[]);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text, text, text[], uuid);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text, text, uuid[], uuid);

-- Drop ALL existing overloads of get_admin_whatsapp_filtered_stats
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_filtered_stats(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_filtered_stats(text, text, text, text, text, text[]);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_filtered_stats(text, text, text, text, text, text[], uuid);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_filtered_stats(text, text, text, text, text, uuid[], uuid);

-- =========================================================
-- RECREATE: Single canonical version of each RPC
-- =========================================================

-- 1. get_admin_whatsapp_conversations
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  phone_number text,
  bitrix_id text,
  lead_name text,
  lead_id bigint,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_direction text,
  last_customer_message_at timestamptz,
  unread_count bigint,
  total_messages bigint,
  last_operator_name text,
  last_operator_photo_url text,
  lead_etapa text,
  response_status text,
  deal_stage_id text,
  deal_status text,
  deal_category_id text,
  deal_count bigint,
  deal_title text,
  contract_number text,
  maxsystem_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_hours integer := 24;
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      MAX(wm.created_at) as last_message_at,
      MAX(CASE WHEN wm.direction = 'incoming' THEN wm.created_at END) as last_customer_message_at,
      COUNT(*) FILTER (WHERE wm.is_read = false AND wm.direction = 'incoming') as unread_count,
      COUNT(*) as total_messages,
      (array_agg(wm.content ORDER BY wm.created_at DESC))[1] as last_message_preview,
      (array_agg(wm.direction ORDER BY wm.created_at DESC))[1] as last_message_direction
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  lead_info AS (
    SELECT DISTINCT ON (wm.phone_number)
      wm.phone_number,
      wm.bitrix_id,
      l.name as lead_name,
      l.id as lead_id,
      l.etapa as lead_etapa
    FROM whatsapp_messages wm
    LEFT JOIN leads l ON wm.bitrix_id = l.id::text
    WHERE wm.bitrix_id IS NOT NULL
    ORDER BY wm.phone_number, wm.created_at DESC
  ),
  last_operator AS (
    SELECT DISTINCT ON (wm.phone_number)
      wm.phone_number,
      p.display_name as operator_name,
      p.avatar_url as operator_photo_url
    FROM whatsapp_messages wm
    JOIN profiles p ON wm.sender_id = p.id
    WHERE wm.direction = 'outgoing' AND wm.sender_id IS NOT NULL
    ORDER BY wm.phone_number, wm.created_at DESC
  ),
  response_info AS (
    SELECT 
      wm.phone_number,
      CASE 
        WHEN MAX(CASE WHEN wm.direction = 'outgoing' THEN wm.created_at END) > 
             MAX(CASE WHEN wm.direction = 'incoming' THEN wm.created_at END) THEN 'replied'
        WHEN MAX(CASE WHEN wm.direction = 'outgoing' THEN 1 ELSE 0 END) = 0 THEN 'never'
        ELSE 'waiting'
      END as response_status
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  deal_info AS (
    SELECT DISTINCT ON (li.phone_number)
      li.phone_number,
      d.stage_id as deal_stage_id,
      CASE 
        WHEN d.stage_id LIKE 'WON%' OR d.stage_id LIKE '%:WON' THEN 'won'
        WHEN d.stage_id LIKE 'LOSE%' OR d.stage_id LIKE '%:LOSE' THEN 'lost'
        ELSE 'open'
      END as deal_status,
      d.category_id as deal_category_id,
      d.title as deal_title,
      d.uf_crm_1722aborede as contract_number,
      d.uf_crm_1729maxsystemid as maxsystem_id
    FROM lead_info li
    JOIN deals d ON li.lead_id = d.contact_id
    ORDER BY li.phone_number, d.created_at DESC
  ),
  deal_counts AS (
    SELECT 
      li.phone_number,
      COUNT(d.id) as deal_count
    FROM lead_info li
    LEFT JOIN deals d ON li.lead_id = d.contact_id
    GROUP BY li.phone_number
  ),
  tag_filter_matches AS (
    SELECT DISTINCT wcta.phone_number
    FROM whatsapp_conversation_tag_assignments wcta
    WHERE p_tag_filter IS NULL OR wcta.tag_id = ANY(p_tag_filter)
  ),
  operator_filter_matches AS (
    SELECT DISTINCT wcp.phone_number
    FROM whatsapp_conversation_participants wcp
    WHERE p_operator_filter IS NULL 
      OR (wcp.operator_id = p_operator_filter AND wcp.resolved_at IS NULL)
  )
  SELECT 
    cs.phone_number,
    li.bitrix_id,
    li.lead_name,
    li.lead_id,
    cs.last_message_at,
    cs.last_message_preview,
    cs.last_message_direction,
    cs.last_customer_message_at,
    cs.unread_count,
    cs.total_messages,
    lo.operator_name as last_operator_name,
    lo.operator_photo_url as last_operator_photo_url,
    li.lead_etapa,
    ri.response_status,
    di.deal_stage_id,
    di.deal_status,
    di.deal_category_id,
    COALESCE(dc.deal_count, 0) as deal_count,
    di.deal_title,
    di.contract_number,
    di.maxsystem_id
  FROM conversation_stats cs
  LEFT JOIN lead_info li ON cs.phone_number = li.phone_number
  LEFT JOIN last_operator lo ON cs.phone_number = lo.phone_number
  LEFT JOIN response_info ri ON cs.phone_number = ri.phone_number
  LEFT JOIN deal_info di ON cs.phone_number = di.phone_number
  LEFT JOIN deal_counts dc ON cs.phone_number = dc.phone_number
  WHERE 
    -- Search filter
    (p_search IS NULL OR p_search = '' OR 
     cs.phone_number ILIKE '%' || p_search || '%' OR
     li.lead_name ILIKE '%' || p_search || '%' OR
     li.bitrix_id ILIKE '%' || p_search || '%' OR
     di.contract_number ILIKE '%' || p_search || '%' OR
     di.maxsystem_id ILIKE '%' || p_search || '%')
    -- Window filter
    AND (p_window_filter = 'all' OR
         (p_window_filter = 'open' AND cs.last_customer_message_at > NOW() - (window_hours || ' hours')::interval) OR
         (p_window_filter = 'closed' AND (cs.last_customer_message_at IS NULL OR cs.last_customer_message_at <= NOW() - (window_hours || ' hours')::interval)))
    -- Response filter
    AND (p_response_filter = 'all' OR 
         (p_response_filter = 'waiting' AND ri.response_status = 'waiting') OR
         (p_response_filter = 'never' AND ri.response_status = 'never') OR
         (p_response_filter = 'replied' AND ri.response_status = 'replied') OR
         (p_response_filter = 'in_progress' AND ri.response_status IN ('waiting', 'never')))
    -- Etapa filter
    AND (p_etapa_filter IS NULL OR li.lead_etapa = p_etapa_filter)
    -- Deal status filter
    AND (p_deal_status_filter = 'all' OR
         (p_deal_status_filter = 'won' AND di.deal_status = 'won') OR
         (p_deal_status_filter = 'lost' AND di.deal_status = 'lost') OR
         (p_deal_status_filter = 'open' AND di.deal_status = 'open') OR
         (p_deal_status_filter = 'no_deal' AND di.deal_status IS NULL))
    -- Tag filter
    AND (p_tag_filter IS NULL OR cs.phone_number IN (SELECT tfm.phone_number FROM tag_filter_matches tfm))
    -- Operator filter
    AND (p_operator_filter IS NULL OR cs.phone_number IN (SELECT ofm.phone_number FROM operator_filter_matches ofm))
  ORDER BY cs.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2. count_admin_whatsapp_conversations
CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_count bigint;
  window_hours integer := 24;
BEGIN
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      MAX(wm.created_at) as last_message_at,
      MAX(CASE WHEN wm.direction = 'incoming' THEN wm.created_at END) as last_customer_message_at
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  lead_info AS (
    SELECT DISTINCT ON (wm.phone_number)
      wm.phone_number,
      wm.bitrix_id,
      l.name as lead_name,
      l.id as lead_id,
      l.etapa as lead_etapa
    FROM whatsapp_messages wm
    LEFT JOIN leads l ON wm.bitrix_id = l.id::text
    WHERE wm.bitrix_id IS NOT NULL
    ORDER BY wm.phone_number, wm.created_at DESC
  ),
  response_info AS (
    SELECT 
      wm.phone_number,
      CASE 
        WHEN MAX(CASE WHEN wm.direction = 'outgoing' THEN wm.created_at END) > 
             MAX(CASE WHEN wm.direction = 'incoming' THEN wm.created_at END) THEN 'replied'
        WHEN MAX(CASE WHEN wm.direction = 'outgoing' THEN 1 ELSE 0 END) = 0 THEN 'never'
        ELSE 'waiting'
      END as response_status
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  deal_info AS (
    SELECT DISTINCT ON (li.phone_number)
      li.phone_number,
      CASE 
        WHEN d.stage_id LIKE 'WON%' OR d.stage_id LIKE '%:WON' THEN 'won'
        WHEN d.stage_id LIKE 'LOSE%' OR d.stage_id LIKE '%:LOSE' THEN 'lost'
        ELSE 'open'
      END as deal_status,
      d.uf_crm_1722adorede as contract_number,
      d.uf_crm_1729maxsystemid as maxsystem_id
    FROM lead_info li
    JOIN deals d ON li.lead_id = d.contact_id
    ORDER BY li.phone_number, d.created_at DESC
  ),
  tag_filter_matches AS (
    SELECT DISTINCT wcta.phone_number
    FROM whatsapp_conversation_tag_assignments wcta
    WHERE p_tag_filter IS NULL OR wcta.tag_id = ANY(p_tag_filter)
  ),
  operator_filter_matches AS (
    SELECT DISTINCT wcp.phone_number
    FROM whatsapp_conversation_participants wcp
    WHERE p_operator_filter IS NULL 
      OR (wcp.operator_id = p_operator_filter AND wcp.resolved_at IS NULL)
  )
  SELECT COUNT(*)
  INTO result_count
  FROM conversation_stats cs
  LEFT JOIN lead_info li ON cs.phone_number = li.phone_number
  LEFT JOIN response_info ri ON cs.phone_number = ri.phone_number
  LEFT JOIN deal_info di ON cs.phone_number = di.phone_number
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
     cs.phone_number ILIKE '%' || p_search || '%' OR
     li.lead_name ILIKE '%' || p_search || '%' OR
     li.bitrix_id ILIKE '%' || p_search || '%' OR
     di.contract_number ILIKE '%' || p_search || '%' OR
     di.maxsystem_id ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' OR
         (p_window_filter = 'open' AND cs.last_customer_message_at > NOW() - (window_hours || ' hours')::interval) OR
         (p_window_filter = 'closed' AND (cs.last_customer_message_at IS NULL OR cs.last_customer_message_at <= NOW() - (window_hours || ' hours')::interval)))
    AND (p_response_filter = 'all' OR 
         (p_response_filter = 'waiting' AND ri.response_status = 'waiting') OR
         (p_response_filter = 'never' AND ri.response_status = 'never') OR
         (p_response_filter = 'replied' AND ri.response_status = 'replied') OR
         (p_response_filter = 'in_progress' AND ri.response_status IN ('waiting', 'never')))
    AND (p_etapa_filter IS NULL OR li.lead_etapa = p_etapa_filter)
    AND (p_deal_status_filter = 'all' OR
         (p_deal_status_filter = 'won' AND di.deal_status = 'won') OR
         (p_deal_status_filter = 'lost' AND di.deal_status = 'lost') OR
         (p_deal_status_filter = 'open' AND di.deal_status = 'open') OR
         (p_deal_status_filter = 'no_deal' AND di.deal_status IS NULL))
    AND (p_tag_filter IS NULL OR cs.phone_number IN (SELECT tfm.phone_number FROM tag_filter_matches tfm))
    AND (p_operator_filter IS NULL OR cs.phone_number IN (SELECT ofm.phone_number FROM operator_filter_matches ofm));
  
  RETURN result_count;
END;
$$;

-- 3. get_admin_whatsapp_filtered_stats
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_filtered_stats(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  total_conversations bigint,
  open_windows bigint,
  total_unread bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_hours integer := 24;
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT 
      wm.phone_number,
      MAX(wm.created_at) as last_message_at,
      MAX(CASE WHEN wm.direction = 'incoming' THEN wm.created_at END) as last_customer_message_at,
      COUNT(*) FILTER (WHERE wm.is_read = false AND wm.direction = 'incoming') as unread_count
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  lead_info AS (
    SELECT DISTINCT ON (wm.phone_number)
      wm.phone_number,
      wm.bitrix_id,
      l.name as lead_name,
      l.id as lead_id,
      l.etapa as lead_etapa
    FROM whatsapp_messages wm
    LEFT JOIN leads l ON wm.bitrix_id = l.id::text
    WHERE wm.bitrix_id IS NOT NULL
    ORDER BY wm.phone_number, wm.created_at DESC
  ),
  response_info AS (
    SELECT 
      wm.phone_number,
      CASE 
        WHEN MAX(CASE WHEN wm.direction = 'outgoing' THEN wm.created_at END) > 
             MAX(CASE WHEN wm.direction = 'incoming' THEN wm.created_at END) THEN 'replied'
        WHEN MAX(CASE WHEN wm.direction = 'outgoing' THEN 1 ELSE 0 END) = 0 THEN 'never'
        ELSE 'waiting'
      END as response_status
    FROM whatsapp_messages wm
    GROUP BY wm.phone_number
  ),
  deal_info AS (
    SELECT DISTINCT ON (li.phone_number)
      li.phone_number,
      CASE 
        WHEN d.stage_id LIKE 'WON%' OR d.stage_id LIKE '%:WON' THEN 'won'
        WHEN d.stage_id LIKE 'LOSE%' OR d.stage_id LIKE '%:LOSE' THEN 'lost'
        ELSE 'open'
      END as deal_status,
      d.uf_crm_1722adorede as contract_number,
      d.uf_crm_1729maxsystemid as maxsystem_id
    FROM lead_info li
    JOIN deals d ON li.lead_id = d.contact_id
    ORDER BY li.phone_number, d.created_at DESC
  ),
  tag_filter_matches AS (
    SELECT DISTINCT wcta.phone_number
    FROM whatsapp_conversation_tag_assignments wcta
    WHERE p_tag_filter IS NULL OR wcta.tag_id = ANY(p_tag_filter)
  ),
  operator_filter_matches AS (
    SELECT DISTINCT wcp.phone_number
    FROM whatsapp_conversation_participants wcp
    WHERE p_operator_filter IS NULL 
      OR (wcp.operator_id = p_operator_filter AND wcp.resolved_at IS NULL)
  ),
  filtered_conversations AS (
    SELECT 
      cs.phone_number,
      cs.last_customer_message_at,
      cs.unread_count
    FROM conversation_stats cs
    LEFT JOIN lead_info li ON cs.phone_number = li.phone_number
    LEFT JOIN response_info ri ON cs.phone_number = ri.phone_number
    LEFT JOIN deal_info di ON cs.phone_number = di.phone_number
    WHERE 
      (p_search IS NULL OR p_search = '' OR 
       cs.phone_number ILIKE '%' || p_search || '%' OR
       li.lead_name ILIKE '%' || p_search || '%' OR
       li.bitrix_id ILIKE '%' || p_search || '%' OR
       di.contract_number ILIKE '%' || p_search || '%' OR
       di.maxsystem_id ILIKE '%' || p_search || '%')
      AND (p_window_filter = 'all' OR
           (p_window_filter = 'open' AND cs.last_customer_message_at > NOW() - (window_hours || ' hours')::interval) OR
           (p_window_filter = 'closed' AND (cs.last_customer_message_at IS NULL OR cs.last_customer_message_at <= NOW() - (window_hours || ' hours')::interval)))
      AND (p_response_filter = 'all' OR 
           (p_response_filter = 'waiting' AND ri.response_status = 'waiting') OR
           (p_response_filter = 'never' AND ri.response_status = 'never') OR
           (p_response_filter = 'replied' AND ri.response_status = 'replied') OR
           (p_response_filter = 'in_progress' AND ri.response_status IN ('waiting', 'never')))
      AND (p_etapa_filter IS NULL OR li.lead_etapa = p_etapa_filter)
      AND (p_deal_status_filter = 'all' OR
           (p_deal_status_filter = 'won' AND di.deal_status = 'won') OR
           (p_deal_status_filter = 'lost' AND di.deal_status = 'lost') OR
           (p_deal_status_filter = 'open' AND di.deal_status = 'open') OR
           (p_deal_status_filter = 'no_deal' AND di.deal_status IS NULL))
      AND (p_tag_filter IS NULL OR cs.phone_number IN (SELECT tfm.phone_number FROM tag_filter_matches tfm))
      AND (p_operator_filter IS NULL OR cs.phone_number IN (SELECT ofm.phone_number FROM operator_filter_matches ofm))
  )
  SELECT 
    COUNT(*)::bigint as total_conversations,
    COUNT(*) FILTER (WHERE fc.last_customer_message_at > NOW() - (window_hours || ' hours')::interval)::bigint as open_windows,
    COALESCE(SUM(fc.unread_count), 0)::bigint as total_unread
  FROM filtered_conversations fc;
END;
$$;