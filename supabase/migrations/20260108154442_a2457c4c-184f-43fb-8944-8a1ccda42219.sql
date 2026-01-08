-- Fix missing columns in get_telemarketing_conversations (p_offset overload)
-- leads has nome_modelo/name (no nome_completo) and telemarketing_operators has name (no operator_name)

CREATE OR REPLACE FUNCTION public.get_telemarketing_conversations(
  p_operator_bitrix_id integer,
  p_team_operator_ids integer[] DEFAULT NULL::integer[],
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  lead_id bigint,
  bitrix_id text,
  lead_name text,
  phone_number text,
  photo_url text,
  last_message_at timestamp with time zone,
  last_message_preview text,
  unread_count bigint,
  window_open boolean,
  telemarketing_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed_operators integer[];
BEGIN
  IF p_team_operator_ids IS NOT NULL AND array_length(p_team_operator_ids, 1) > 0 THEN
    v_allowed_operators := p_team_operator_ids;
  ELSE
    v_allowed_operators := ARRAY[p_operator_bitrix_id];
  END IF;

  RETURN QUERY
  WITH lead_messages AS (
    SELECT DISTINCT ON (l.id)
      l.id as lead_id,
      l.id::text as bitrix_id,
      COALESCE(l.nome_modelo, l.name, 'Lead #' || l.id::text) as lead_name,
      COALESCE(
        NULLIF(regexp_replace(l.celular, '[^0-9]', '', 'g'), ''),
        NULLIF(regexp_replace(l.telefone_casa, '[^0-9]', '', 'g'), ''),
        NULLIF(regexp_replace(l.telefone_trabalho, '[^0-9]', '', 'g'), ''),
        NULLIF(regexp_replace(l.phone_normalized, '[^0-9]', '', 'g'), ''),
        (
          SELECT regexp_replace(m2.phone_number, '[^0-9]', '', 'g')
          FROM whatsapp_messages m2
          WHERE m2.bitrix_id = l.id::text
          ORDER BY m2.created_at DESC
          LIMIT 1
        )
      ) as phone_number,
      l.photo_url,
      m.created_at as last_message_at,
      CASE 
        WHEN length(m.content) > 50 THEN left(m.content, 50) || '...'
        ELSE m.content
      END as last_message_preview,
      (
        SELECT COUNT(*)
        FROM whatsapp_messages um
        WHERE (
          um.bitrix_id = l.id::text
          OR right(regexp_replace(um.phone_number, '[^0-9]', '', 'g'), 9) = right(
            COALESCE(
              NULLIF(regexp_replace(l.celular, '[^0-9]', '', 'g'), ''),
              NULLIF(regexp_replace(l.telefone_casa, '[^0-9]', '', 'g'), ''),
              NULLIF(regexp_replace(l.telefone_trabalho, '[^0-9]', '', 'g'), ''),
              NULLIF(regexp_replace(l.phone_normalized, '[^0-9]', '', 'g'), '')
            ), 9)
        )
        AND um.direction = 'inbound'
        AND um.read_at IS NULL
      ) as unread_count,
      EXISTS (
        SELECT 1 FROM whatsapp_messages wm
        WHERE (
          wm.bitrix_id = l.id::text
          OR right(regexp_replace(wm.phone_number, '[^0-9]', '', 'g'), 9) = right(
            COALESCE(
              NULLIF(regexp_replace(l.celular, '[^0-9]', '', 'g'), ''),
              NULLIF(regexp_replace(l.telefone_casa, '[^0-9]', '', 'g'), ''),
              NULLIF(regexp_replace(l.telefone_trabalho, '[^0-9]', '', 'g'), ''),
              NULLIF(regexp_replace(l.phone_normalized, '[^0-9]', '', 'g'), '')
            ), 9)
        )
        AND wm.direction = 'inbound'
        AND wm.created_at > now() - interval '24 hours'
      ) as window_open,
      t.name as telemarketing_name
    FROM leads l
    LEFT JOIN telemarketing_operators t ON t.bitrix_id = l.bitrix_telemarketing_id
    LEFT JOIN LATERAL (
      SELECT m1.content, m1.created_at
      FROM whatsapp_messages m1
      WHERE m1.bitrix_id = l.id::text
         OR right(regexp_replace(m1.phone_number, '[^0-9]', '', 'g'), 9) = right(
              COALESCE(
                NULLIF(regexp_replace(l.celular, '[^0-9]', '', 'g'), ''),
                NULLIF(regexp_replace(l.telefone_casa, '[^0-9]', '', 'g'), ''),
                NULLIF(regexp_replace(l.telefone_trabalho, '[^0-9]', '', 'g'), ''),
                NULLIF(regexp_replace(l.phone_normalized, '[^0-9]', '', 'g'), '')
              ), 9)
      ORDER BY m1.created_at DESC
      LIMIT 1
    ) m ON true
    WHERE l.bitrix_telemarketing_id = ANY(v_allowed_operators)
      AND m.created_at IS NOT NULL
      AND (
        p_search IS NULL 
        OR p_search = ''
        OR COALESCE(l.nome_modelo, l.name, '') ILIKE '%' || p_search || '%'
        OR COALESCE(l.celular, l.telefone_casa, l.telefone_trabalho, l.phone_normalized, '') ILIKE '%' || p_search || '%'
        OR t.name ILIKE '%' || p_search || '%'
      )
    ORDER BY l.id, m.created_at DESC
  )
  SELECT 
    lm.lead_id,
    lm.bitrix_id,
    lm.lead_name,
    lm.phone_number,
    lm.photo_url,
    lm.last_message_at,
    lm.last_message_preview,
    lm.unread_count,
    lm.window_open,
    lm.telemarketing_name
  FROM lead_messages lm
  ORDER BY lm.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_telemarketing_conversations(integer,integer[],text,integer,integer) TO authenticated;