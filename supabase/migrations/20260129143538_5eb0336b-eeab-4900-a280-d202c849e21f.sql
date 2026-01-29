-- Fix: remove reference to non-existent resolved_at column

CREATE OR REPLACE FUNCTION public.get_my_invited_conversations_full(p_operator_id uuid)
RETURNS TABLE (
  phone_number text,
  bitrix_id text,
  priority integer,
  inviter_name text,
  invited_at timestamptz,
  invited_by uuid,
  lead_name text,
  last_message_at timestamptz,
  last_message_preview text,
  is_window_open boolean,
  unread_count bigint,
  lead_etapa text,
  response_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only allow access to own data
  IF p_operator_id != auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: cannot access other user data';
  END IF;

  RETURN QUERY
  SELECT 
    p.phone_number,
    p.bitrix_id,
    COALESCE(p.priority, 0)::integer as priority,
    p.inviter_name as inviter_name,
    p.invited_at,
    p.invited_by,
    COALESCE(l.name, p.phone_number) as lead_name,
    s.last_message_at,
    s.last_message_preview,
    COALESCE(s.is_window_open, false) as is_window_open,
    COALESCE(s.unread_count, 0) as unread_count,
    l.etapa as lead_etapa,
    s.response_status::text
  FROM whatsapp_conversation_participants p
  LEFT JOIN mv_whatsapp_conversation_stats s 
    ON s.phone_number = p.phone_number 
    AND (s.bitrix_id = p.bitrix_id OR (s.bitrix_id IS NULL AND p.bitrix_id IS NULL))
  LEFT JOIN leads l ON l.id = CASE 
    WHEN p.bitrix_id IS NOT NULL AND p.bitrix_id ~ '^[0-9]+$' 
    THEN p.bitrix_id::bigint 
    ELSE NULL 
  END
  WHERE p.operator_id = p_operator_id
  ORDER BY p.priority DESC NULLS LAST, s.last_message_at DESC NULLS LAST;
END;
$$;