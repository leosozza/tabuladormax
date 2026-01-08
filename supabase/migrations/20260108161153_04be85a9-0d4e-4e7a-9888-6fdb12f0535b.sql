-- Fix: whatsapp_messages não tem media_mime_type, é media_type
DROP FUNCTION IF EXISTS public.get_telemarketing_whatsapp_messages(integer,text,bigint,integer[],integer);

CREATE OR REPLACE FUNCTION public.get_telemarketing_whatsapp_messages(
  p_operator_bitrix_id integer DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_lead_id bigint DEFAULT NULL,
  p_team_operator_ids integer[] DEFAULT NULL,
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  id uuid,
  phone_number text,
  bitrix_id text,
  gupshup_message_id text,
  direction text,
  message_type text,
  content text,
  template_name text,
  status text,
  media_url text,
  media_type text,
  created_at timestamptz,
  read_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  v_phone := NULLIF(REGEXP_REPLACE(COALESCE(p_phone_number, ''), '\D', '', 'g'), '');

  RETURN QUERY
  SELECT 
    m.id,
    m.phone_number,
    m.bitrix_id,
    m.gupshup_message_id,
    m.direction,
    m.message_type,
    m.content,
    m.template_name,
    m.status,
    m.media_url,
    m.media_type,
    m.created_at,
    m.read_at,
    m.metadata
  FROM public.whatsapp_messages m
  WHERE 
    (p_lead_id IS NOT NULL AND m.bitrix_id = p_lead_id::text)
    OR (v_phone IS NOT NULL AND v_phone != '' AND (
      m.phone_number = v_phone 
      OR RIGHT(m.phone_number, 9) = RIGHT(v_phone, 9)
    ))
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;