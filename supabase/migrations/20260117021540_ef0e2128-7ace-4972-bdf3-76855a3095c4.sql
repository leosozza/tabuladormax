-- Fix phone matching in get_scouter_leads_simple to handle 9-digit variation
-- Lead phone_normalized may have 13 digits (with 9) while message phone_number has 12 (without 9)

CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_ids integer[] DEFAULT NULL::integer[],
  p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_status text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_sort_field text DEFAULT 'date_create'::text,
  p_sort_direction text DEFAULT 'desc'::text,
  p_template_status text DEFAULT NULL::text,
  p_empreendimento text DEFAULT NULL::text
)
RETURNS TABLE(
  id integer,
  bitrix_id text,
  name text,
  phone text,
  phone_normalized text,
  email text,
  status_id text,
  date_create timestamp with time zone,
  assigned_by_id integer,
  assigned_by_name text,
  source_id text,
  source_description text,
  empreendimento text,
  uf_crm_1736abordar text,
  uf_crm_1741telefone2 text,
  comments text,
  last_updated_at timestamp with time zone,
  raw jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_activity_at timestamp with time zone,
  template_send_count bigint,
  template_status text,
  template_error_reason text,
  total_count bigint
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_order_by TEXT;
  v_search_pattern TEXT;
BEGIN
  -- Build order by clause
  v_order_by := CASE 
    WHEN p_sort_field = 'name' THEN 'l.name'
    WHEN p_sort_field = 'status_id' THEN 'l.status_id'
    WHEN p_sort_field = 'assigned_by_name' THEN 'l.assigned_by_name'
    WHEN p_sort_field = 'empreendimento' THEN 'l.empreendimento'
    WHEN p_sort_field = 'template_send_count' THEN 'template_send_count'
    WHEN p_sort_field = 'template_status' THEN 'template_status'
    ELSE 'l.date_create'
  END;
  
  v_order_by := v_order_by || ' ' || CASE WHEN p_sort_direction = 'asc' THEN 'ASC' ELSE 'DESC' END || ' NULLS LAST';
  
  -- Prepare search pattern
  IF p_search IS NOT NULL AND p_search != '' THEN
    v_search_pattern := '%' || LOWER(p_search) || '%';
  END IF;

  RETURN QUERY EXECUTE format('
    WITH filtered_leads AS (
      SELECT 
        l.id,
        l.bitrix_id::text,
        l.name,
        l.phone,
        l.phone_normalized,
        l.email,
        l.status_id,
        l.date_create,
        l.assigned_by_id,
        l.assigned_by_name,
        l.source_id,
        l.source_description,
        l.empreendimento,
        l.uf_crm_1736abordar,
        l.uf_crm_1741telefone2,
        l.comments,
        l.last_updated_at,
        l.raw,
        l.created_at,
        l.updated_at,
        l.last_activity_at
      FROM leads l
      WHERE 
        ($1 IS NULL OR l.assigned_by_id = ANY($1))
        AND ($2 IS NULL OR l.date_create >= $2)
        AND ($3 IS NULL OR l.date_create <= $3)
        AND ($4 IS NULL OR l.status_id = $4)
        AND ($5 IS NULL OR l.empreendimento = $5)
        AND (
          $6 IS NULL 
          OR LOWER(l.name) LIKE $6
          OR l.phone LIKE $6
          OR l.phone_normalized LIKE $6
          OR LOWER(l.email) LIKE $6
          OR l.bitrix_id::text LIKE $6
        )
    ),
    lead_messages AS (
      SELECT 
        fl.*,
        msg.send_count,
        msg.last_status,
        msg.last_error_reason
      FROM filtered_leads fl
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*)::bigint as send_count,
          (array_agg(w.status ORDER BY w.created_at DESC))[1] as last_status,
          (array_agg(w.error_reason ORDER BY w.created_at DESC))[1] as last_error_reason
        FROM whatsapp_messages w
        WHERE w.direction = ''outbound''
          AND w.message_type = ''template''
          AND (
            -- Priority 1: Match by bitrix_id
            w.bitrix_id = fl.id::TEXT
            OR (
              -- Priority 2: Fallback by phone when bitrix_id is null
              w.bitrix_id IS NULL
              AND (
                -- Exact match
                w.phone_number = fl.phone_normalized
                OR 
                -- Lead has 13 digits (with 9), message has 12 (without 9)
                -- Remove 5th digit (the 9) from lead phone to match
                (
                  LENGTH(fl.phone_normalized) = 13 
                  AND LENGTH(w.phone_number) = 12
                  AND SUBSTRING(fl.phone_normalized, 1, 4) || SUBSTRING(fl.phone_normalized, 6) = w.phone_number
                )
                OR
                -- Lead has 12 digits (without 9), message has 13 (with 9)
                -- Remove 5th digit from message phone to match
                (
                  LENGTH(fl.phone_normalized) = 12 
                  AND LENGTH(w.phone_number) = 13
                  AND fl.phone_normalized = SUBSTRING(w.phone_number, 1, 4) || SUBSTRING(w.phone_number, 6)
                )
              )
            )
          )
      ) msg ON true
    ),
    filtered_by_template AS (
      SELECT *
      FROM lead_messages lm
      WHERE (
        $7 IS NULL
        OR ($7 = ''sent'' AND lm.send_count > 0 AND lm.last_status IN (''sent'', ''delivered'', ''read''))
        OR ($7 = ''pending'' AND lm.send_count > 0 AND lm.last_status = ''pending'')
        OR ($7 = ''failed'' AND lm.send_count > 0 AND lm.last_status = ''failed'')
        OR ($7 = ''not_sent'' AND (lm.send_count = 0 OR lm.send_count IS NULL))
      )
    ),
    counted AS (
      SELECT COUNT(*)::bigint as total FROM filtered_by_template
    )
    SELECT 
      f.id,
      f.bitrix_id,
      f.name,
      f.phone,
      f.phone_normalized,
      f.email,
      f.status_id,
      f.date_create,
      f.assigned_by_id,
      f.assigned_by_name,
      f.source_id,
      f.source_description,
      f.empreendimento,
      f.uf_crm_1736abordar,
      f.uf_crm_1741telefone2,
      f.comments,
      f.last_updated_at,
      f.raw,
      f.created_at,
      f.updated_at,
      f.last_activity_at,
      COALESCE(f.send_count, 0)::bigint as template_send_count,
      f.last_status as template_status,
      f.last_error_reason as template_error_reason,
      c.total as total_count
    FROM filtered_by_template f
    CROSS JOIN counted c
    ORDER BY %s
    LIMIT $8 OFFSET $9
  ', v_order_by)
  USING p_scouter_ids, p_date_from, p_date_to, p_status, p_empreendimento, v_search_pattern, p_template_status, p_limit, p_offset;
END;
$function$;