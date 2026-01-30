-- Atualizar RPC para suportar paginação com offset
CREATE OR REPLACE FUNCTION public.get_telemarketing_whatsapp_messages(
  p_operator_bitrix_id integer DEFAULT NULL::integer,
  p_phone_number text DEFAULT NULL::text,
  p_lead_id integer DEFAULT NULL::integer,
  p_team_operator_ids integer[] DEFAULT NULL::integer[],
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
   id uuid, 
   phone_number text, 
   bitrix_id text, 
   conversation_id integer, 
   gupshup_message_id text, 
   direction text, 
   message_type text, 
   content text, 
   template_name text, 
   status text, 
   sent_by text, 
   sender_name text, 
   media_url text, 
   media_type text, 
   created_at timestamp with time zone, 
   delivered_at timestamp with time zone, 
   read_at timestamp with time zone, 
   metadata jsonb,
   total_count bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_total bigint;
BEGIN
  v_phone := NULLIF(REGEXP_REPLACE(COALESCE(p_phone_number, ''), '\D', '', 'g'), '');

  -- Calcular total de mensagens para a conversa
  SELECT COUNT(*) INTO v_total
  FROM public.whatsapp_messages msg
  WHERE 
    (p_lead_id IS NOT NULL AND msg.bitrix_id = p_lead_id::text)
    OR (v_phone IS NOT NULL AND v_phone != '' AND (
      msg.phone_number = v_phone 
      OR RIGHT(msg.phone_number, 9) = RIGHT(v_phone, 9)
    ));

  RETURN QUERY
  SELECT 
    m.id,
    m.phone_number,
    m.bitrix_id,
    m.conversation_id,
    m.gupshup_message_id,
    m.direction,
    m.message_type,
    m.content,
    m.template_name,
    m.status,
    m.sent_by,
    m.sender_name,
    m.media_url,
    m.media_type,
    m.created_at,
    m.delivered_at,
    m.read_at,
    m.metadata,
    v_total AS total_count
  FROM public.whatsapp_messages m
  WHERE 
    (p_lead_id IS NOT NULL AND m.bitrix_id = p_lead_id::text)
    OR (v_phone IS NOT NULL AND v_phone != '' AND (
      m.phone_number = v_phone 
      OR RIGHT(m.phone_number, 9) = RIGHT(v_phone, 9)
    ))
  ORDER BY m.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;