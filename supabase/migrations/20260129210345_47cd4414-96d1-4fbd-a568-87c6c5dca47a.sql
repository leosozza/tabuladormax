-- ============================================
-- Migração: Adicionar filtro por operador às RPCs de conversas WhatsApp
-- ============================================

-- Atualizar RPC get_admin_whatsapp_conversations com filtro por operador
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_conversations(
  p_limit integer DEFAULT 30, 
  p_offset integer DEFAULT 0, 
  p_search text DEFAULT NULL::text, 
  p_window_filter text DEFAULT 'all'::text, 
  p_response_filter text DEFAULT 'all'::text, 
  p_etapa_filter text DEFAULT NULL::text, 
  p_deal_status_filter text DEFAULT 'all'::text,
  p_tag_filter text[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS TABLE(
  phone_number text, 
  bitrix_id text, 
  lead_name text, 
  lead_id bigint, 
  last_message_at timestamp with time zone, 
  last_message_preview text, 
  last_message_direction text, 
  last_customer_message_at timestamp with time zone, 
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
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.phone_number,
    s.bitrix_id,
    COALESCE(l.name, s.phone_number) AS lead_name,
    l.id AS lead_id,
    s.last_message_at,
    s.last_message_preview,
    s.last_message_direction,
    s.last_customer_message_at,
    s.unread_count,
    s.total_messages,
    atm.bitrix_telemarketing_name AS last_operator_name,
    bse.photo_url AS last_operator_photo_url,
    l.etapa AS lead_etapa,
    s.response_status,
    deal_summary.latest_stage_id AS deal_stage_id,
    CASE 
      WHEN deal_summary.has_won = 1 THEN 'won'
      WHEN deal_summary.has_open = 1 THEN 'open'
      WHEN deal_summary.deal_count > 0 THEN 'lost'
      ELSE NULL
    END AS deal_status,
    deal_summary.latest_category_id AS deal_category_id,
    COALESCE(deal_summary.deal_count, 0) AS deal_count,
    deal_summary.latest_title AS deal_title,
    deal_summary.contract_number,
    deal_summary.maxsystem_id
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
    -- Filtro por tag (verifica se existe atribuição de tag para este telefone)
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_tag_assignments wcta
      WHERE wcta.phone_number = s.phone_number
        AND wcta.tag_id = ANY(p_tag_filter)
    ))
    -- Filtro por operador participante/convidado
    AND (p_operator_filter IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_participants wcp
      WHERE wcp.phone_number = s.phone_number
        AND wcp.operator_id = p_operator_filter
        AND wcp.resolved_at IS NULL
    ))
  ORDER BY s.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Atualizar count_admin_whatsapp_conversations com filtro por operador
CREATE OR REPLACE FUNCTION public.count_admin_whatsapp_conversations(
  p_search text DEFAULT NULL::text, 
  p_window_filter text DEFAULT 'all'::text, 
  p_response_filter text DEFAULT 'all'::text, 
  p_etapa_filter text DEFAULT NULL::text, 
  p_deal_status_filter text DEFAULT 'all'::text,
  p_tag_filter text[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
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
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_tag_assignments wcta
      WHERE wcta.phone_number = s.phone_number
        AND wcta.tag_id = ANY(p_tag_filter)
    ))
    AND (p_operator_filter IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_participants wcp
      WHERE wcp.phone_number = s.phone_number
        AND wcp.operator_id = p_operator_filter
        AND wcp.resolved_at IS NULL
    ));
    
  RETURN result;
END;
$function$;

-- Atualizar get_admin_whatsapp_filtered_stats com filtro por operador
CREATE OR REPLACE FUNCTION public.get_admin_whatsapp_filtered_stats(
  p_search text DEFAULT NULL::text, 
  p_window_filter text DEFAULT 'all'::text, 
  p_response_filter text DEFAULT 'all'::text, 
  p_etapa_filter text DEFAULT NULL::text, 
  p_deal_status_filter text DEFAULT 'all'::text,
  p_tag_filter text[] DEFAULT NULL,
  p_operator_filter uuid DEFAULT NULL
)
RETURNS TABLE(
  total_conversations bigint,
  open_windows bigint,
  total_unread bigint
)
LANGUAGE plpgsql
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
    AND (p_tag_filter IS NULL OR array_length(p_tag_filter, 1) IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_tag_assignments wcta
      WHERE wcta.phone_number = s.phone_number
        AND wcta.tag_id = ANY(p_tag_filter)
    ))
    AND (p_operator_filter IS NULL OR EXISTS (
      SELECT 1 FROM whatsapp_conversation_participants wcp
      WHERE wcp.phone_number = s.phone_number
        AND wcp.operator_id = p_operator_filter
        AND wcp.resolved_at IS NULL
    ));
END;
$function$;