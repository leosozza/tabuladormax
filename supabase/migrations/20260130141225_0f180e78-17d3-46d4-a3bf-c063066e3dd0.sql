
-- =============================================================
-- LIMPEZA DEFINITIVA DE OVERLOADS - WhatsApp RPCs
-- Elimina TODAS as versões existentes e recria UMA única canônica
-- =============================================================

-- 1) DROP de TODAS as versões de get_admin_whatsapp_conversations
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(text, text, text, text, text, uuid[], uuid, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(text, text, text, text, uuid[], uuid, text, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(text, text, text, text, text[], text, text, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text, text, uuid[], uuid);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(text, integer, integer, text, text, text, text[], text, text, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(text, integer, integer, text, text, text, uuid[], uuid, text, text);

-- 2) DROP de TODAS as versões de count_admin_whatsapp_conversations
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text, text, uuid[], uuid, text);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text, uuid[], uuid, text, text);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text, text[], text, text, text);

-- 3) DROP de TODAS as versões de get_admin_whatsapp_filtered_stats
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_filtered_stats(text, text, text, text, text, uuid[], uuid, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_filtered_stats(text, text, text, text, uuid[], uuid, text, text);
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_filtered_stats(text, text, text, text, text[], text, text, text);

-- =============================================================
-- RECRIAR VERSÃO CANÔNICA ÚNICA (sem overloads)
-- Assinatura: todos os parâmetros opcionais com DEFAULT NULL
-- Tipos: p_tag_filter uuid[], p_operator_filter uuid
-- =============================================================

-- get_admin_whatsapp_conversations - VERSÃO CANÔNICA ÚNICA
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS TABLE(
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
  maxsystem_id text,
  is_closed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.phone_number::text,
    s.bitrix_id::text,
    COALESCE(l.name, l.nome_modelo)::text AS lead_name,
    l.id AS lead_id,
    s.last_message_at,
    s.last_message_preview::text,
    s.last_message_direction::text,
    s.last_customer_message_at,
    COALESCE(s.unread_count, 0)::bigint AS unread_count,
    COALESCE(s.total_messages, 0)::bigint AS total_messages,
    COALESCE(bse.title, atm.bitrix_telemarketing_name)::text AS last_operator_name,
    bse.photo_url::text AS last_operator_photo_url,
    l.etapa::text AS lead_etapa,
    s.response_status::text,
    deal_summary.latest_stage_id::text AS deal_stage_id,
    CASE 
      WHEN deal_summary.has_won = 1 THEN 'won'
      WHEN deal_summary.deal_count > 0 AND deal_summary.has_won = 0 AND deal_summary.has_open = 0 THEN 'lost'
      WHEN deal_summary.has_open = 1 THEN 'open'
      ELSE NULL
    END AS deal_status,
    deal_summary.latest_category_id::text AS deal_category_id,
    COALESCE(deal_summary.deal_count, 0)::bigint AS deal_count,
    deal_summary.latest_title::text AS deal_title,
    deal_summary.contract_number::text,
    COALESCE(deal_summary.maxsystem_id, l.maxsystem_id_ficha)::text AS maxsystem_id,
    COALESCE(s.is_closed, false) AS is_closed
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON l.id = CASE 
    WHEN s.bitrix_id IS NOT NULL AND s.bitrix_id ~ '^[0-9]+$' 
    THEN s.bitrix_id::bigint 
    ELSE NULL 
  END
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::bigint AS deal_count,
      MAX(CASE WHEN d.stage_id LIKE '%:WON' THEN 1 ELSE 0 END) AS has_won,
      MAX(CASE WHEN d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE' THEN 1 ELSE 0 END) AS has_open,
      (SELECT d2.stage_id FROM deals d2 WHERE d2.bitrix_lead_id = l.id::integer ORDER BY d2.created_at DESC NULLS LAST LIMIT 1) AS latest_stage_id,
      (SELECT d2.category_id FROM deals d2 WHERE d2.bitrix_lead_id = l.id::integer ORDER BY d2.created_at DESC NULLS LAST LIMIT 1) AS latest_category_id,
      (SELECT d2.title FROM deals d2 WHERE d2.bitrix_lead_id = l.id::integer ORDER BY d2.created_at DESC NULLS LAST LIMIT 1) AS latest_title,
      (SELECT d2.raw->>'UF_CRM_690CA589A27DD' FROM deals d2 WHERE d2.bitrix_lead_id = l.id::integer AND d2.stage_id LIKE '%:WON' ORDER BY d2.created_at DESC NULLS LAST LIMIT 1) AS contract_number,
      (SELECT d2.raw->>'UF_CRM_MAXSYSTEMIDFICHA' FROM deals d2 WHERE d2.bitrix_lead_id = l.id::integer AND d2.stage_id LIKE '%:WON' ORDER BY d2.created_at DESC NULLS LAST LIMIT 1) AS maxsystem_id
    FROM deals d
    WHERE d.bitrix_lead_id = l.id::integer
  ) deal_summary ON true
  LEFT JOIN agent_telemarketing_mapping atm 
    ON l.bitrix_telemarketing_id = atm.bitrix_telemarketing_id
  LEFT JOIN bitrix_spa_entities bse 
    ON atm.bitrix_telemarketing_id = bse.bitrix_item_id 
    AND bse.entity_type_id = 1062
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR 
      s.bitrix_id ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' 
      OR (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours')
      OR (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' 
      OR s.response_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' 
      OR (p_etapa_filter = 'Lead convertido' AND l.etapa IN ('Lead convertido', 'CONVERTED'))
      OR l.etapa = p_etapa_filter)
    AND (p_deal_status_filter = 'all' 
      OR (p_deal_status_filter = 'won' AND deal_summary.has_won = 1)
      OR (p_deal_status_filter = 'lost' AND deal_summary.deal_count > 0 AND deal_summary.has_won = 0 AND deal_summary.has_open = 0)
      OR (p_deal_status_filter = 'open' AND deal_summary.has_open = 1 AND deal_summary.has_won = 0)
      OR (p_deal_status_filter = 'no_deal' AND (deal_summary.deal_count IS NULL OR deal_summary.deal_count = 0)))
    AND (p_closed_filter = 'all'
      OR (p_closed_filter = 'active' AND COALESCE(s.is_closed, false) = false)
      OR (p_closed_filter = 'closed' AND COALESCE(s.is_closed, false) = true))
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_tag_assignments wcta
      WHERE wcta.phone_number = s.phone_number
        AND wcta.tag_id = ANY(p_tag_filter)
    ))
    AND (p_operator_filter IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_participants wcp
      WHERE wcp.phone_number = s.phone_number
        AND wcp.operator_id = p_operator_filter
    ))
  ORDER BY s.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- count_admin_whatsapp_conversations - VERSÃO CANÔNICA ÚNICA
CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result bigint;
BEGIN
  SELECT COUNT(*)
  INTO result
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON l.id = CASE 
    WHEN s.bitrix_id IS NOT NULL AND s.bitrix_id ~ '^[0-9]+$' 
    THEN s.bitrix_id::bigint 
    ELSE NULL 
  END
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::bigint AS deal_count,
      MAX(CASE WHEN d.stage_id LIKE '%:WON' THEN 1 ELSE 0 END) AS has_won,
      MAX(CASE WHEN d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE' THEN 1 ELSE 0 END) AS has_open
    FROM deals d
    WHERE d.bitrix_lead_id = l.id::integer
  ) deal_summary ON true
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR 
      s.bitrix_id ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' 
      OR (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours')
      OR (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' 
      OR s.response_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' 
      OR (p_etapa_filter = 'Lead convertido' AND l.etapa IN ('Lead convertido', 'CONVERTED'))
      OR l.etapa = p_etapa_filter)
    AND (p_deal_status_filter = 'all' 
      OR (p_deal_status_filter = 'won' AND deal_summary.has_won = 1)
      OR (p_deal_status_filter = 'lost' AND deal_summary.deal_count > 0 AND deal_summary.has_won = 0 AND deal_summary.has_open = 0)
      OR (p_deal_status_filter = 'open' AND deal_summary.has_open = 1 AND deal_summary.has_won = 0)
      OR (p_deal_status_filter = 'no_deal' AND (deal_summary.deal_count IS NULL OR deal_summary.deal_count = 0)))
    AND (p_closed_filter = 'all'
      OR (p_closed_filter = 'active' AND COALESCE(s.is_closed, false) = false)
      OR (p_closed_filter = 'closed' AND COALESCE(s.is_closed, false) = true))
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_tag_assignments wcta
      WHERE wcta.phone_number = s.phone_number
        AND wcta.tag_id = ANY(p_tag_filter)
    ))
    AND (p_operator_filter IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_participants wcp
      WHERE wcp.phone_number = s.phone_number
        AND wcp.operator_id = p_operator_filter
    ));
    
  RETURN result;
END;
$function$;

-- get_admin_whatsapp_filtered_stats - VERSÃO CANÔNICA ÚNICA
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_filtered_stats(
  p_search text DEFAULT NULL,
  p_window_filter text DEFAULT 'all',
  p_response_filter text DEFAULT 'all',
  p_etapa_filter text DEFAULT NULL,
  p_deal_status_filter text DEFAULT 'all',
  p_closed_filter text DEFAULT 'active',
  p_tag_filter uuid[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS TABLE(
  total_conversations bigint,
  open_windows bigint,
  total_unread bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_conversations,
    COUNT(*) FILTER (WHERE s.last_customer_message_at > NOW() - INTERVAL '24 hours')::bigint AS open_windows,
    COALESCE(SUM(s.unread_count), 0)::bigint AS total_unread
  FROM mv_whatsapp_conversation_stats s
  LEFT JOIN leads l ON l.id = CASE 
    WHEN s.bitrix_id IS NOT NULL AND s.bitrix_id ~ '^[0-9]+$' 
    THEN s.bitrix_id::bigint 
    ELSE NULL 
  END
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::bigint AS deal_count,
      MAX(CASE WHEN d.stage_id LIKE '%:WON' THEN 1 ELSE 0 END) AS has_won,
      MAX(CASE WHEN d.stage_id NOT LIKE '%:WON' AND d.stage_id NOT LIKE '%:LOSE' THEN 1 ELSE 0 END) AS has_open
    FROM deals d
    WHERE d.bitrix_lead_id = l.id::integer
  ) deal_summary ON true
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
      s.phone_number ILIKE '%' || p_search || '%' OR 
      s.bitrix_id ILIKE '%' || p_search || '%' OR
      l.name ILIKE '%' || p_search || '%')
    AND (p_window_filter = 'all' 
      OR (p_window_filter = 'open' AND s.last_customer_message_at > NOW() - INTERVAL '24 hours')
      OR (p_window_filter = 'closed' AND (s.last_customer_message_at IS NULL OR s.last_customer_message_at <= NOW() - INTERVAL '24 hours')))
    AND (p_response_filter = 'all' 
      OR s.response_status = p_response_filter)
    AND (p_etapa_filter IS NULL OR p_etapa_filter = '' 
      OR (p_etapa_filter = 'Lead convertido' AND l.etapa IN ('Lead convertido', 'CONVERTED'))
      OR l.etapa = p_etapa_filter)
    AND (p_deal_status_filter = 'all' 
      OR (p_deal_status_filter = 'won' AND deal_summary.has_won = 1)
      OR (p_deal_status_filter = 'lost' AND deal_summary.deal_count > 0 AND deal_summary.has_won = 0 AND deal_summary.has_open = 0)
      OR (p_deal_status_filter = 'open' AND deal_summary.has_open = 1 AND deal_summary.has_won = 0)
      OR (p_deal_status_filter = 'no_deal' AND (deal_summary.deal_count IS NULL OR deal_summary.deal_count = 0)))
    AND (p_closed_filter = 'all'
      OR (p_closed_filter = 'active' AND COALESCE(s.is_closed, false) = false)
      OR (p_closed_filter = 'closed' AND COALESCE(s.is_closed, false) = true))
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_tag_assignments wcta
      WHERE wcta.phone_number = s.phone_number
        AND wcta.tag_id = ANY(p_tag_filter)
    ))
    AND (p_operator_filter IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_participants wcp
      WHERE wcp.phone_number = s.phone_number
        AND wcp.operator_id = p_operator_filter
    ));
END;
$function$;

-- Recarregar schema cache imediatamente
NOTIFY pgrst, 'reload schema';
