-- FASE A: Corrigir get_scouter_leads_simple para match inteligente de telefone (com/sem 9)
-- Esta é a versão que recebe p_scouter_name como TEXT

CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name text,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 1000
)
RETURNS TABLE (
  lead_id bigint,
  lead_name text,
  phone_normalized text,
  address text,
  lat double precision,
  lng double precision,
  status text,
  photo_url text,
  additional_photos jsonb,
  created_date timestamp with time zone,
  scouter_name text,
  template_send_count bigint,
  template_status text,
  template_error_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_leads AS (
    SELECT 
      l.id,
      l.name,
      l.phone_normalized,
      l.address,
      l.lat,
      l.lng,
      l.status,
      l.photo_url,
      l.additional_photos,
      l.created_date,
      l.scouter
    FROM leads l
    WHERE 
      l.scouter = p_scouter_name
      AND (p_date_from IS NULL OR l.created_date >= p_date_from::timestamp with time zone)
      AND (p_date_to IS NULL OR l.created_date <= (p_date_to::date + interval '1 day')::timestamp with time zone)
      AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l.created_date DESC
    LIMIT p_limit
  ),
  -- Subquery para calcular status de template com match inteligente de telefone
  template_stats AS (
    SELECT 
      fl.id as lead_id,
      COUNT(w.id) as send_count,
      (
        SELECT w2.status 
        FROM whatsapp_messages w2 
        WHERE w2.message_type = 'template'
          AND (
            -- Match por bitrix_id (prioridade)
            w2.bitrix_id = fl.id::text
            -- OU match por telefone exato
            OR w2.phone_number = fl.phone_normalized
            -- OU match inteligente: lead tem 13 dígitos (com 9), msg tem 12 (sem 9)
            OR (
              LENGTH(fl.phone_normalized) = 13 
              AND LENGTH(w2.phone_number) = 12
              AND SUBSTRING(fl.phone_normalized, 1, 4) || SUBSTRING(fl.phone_normalized, 6) = w2.phone_number
            )
            -- OU match inteligente inverso: lead tem 12 dígitos (sem 9), msg tem 13 (com 9)
            OR (
              LENGTH(fl.phone_normalized) = 12 
              AND LENGTH(w2.phone_number) = 13
              AND fl.phone_normalized = SUBSTRING(w2.phone_number, 1, 4) || SUBSTRING(w2.phone_number, 6)
            )
          )
        ORDER BY w2.created_at DESC 
        LIMIT 1
      ) as last_status,
      (
        SELECT w3.error_reason 
        FROM whatsapp_messages w3 
        WHERE w3.message_type = 'template'
          AND (
            w3.bitrix_id = fl.id::text
            OR w3.phone_number = fl.phone_normalized
            OR (
              LENGTH(fl.phone_normalized) = 13 
              AND LENGTH(w3.phone_number) = 12
              AND SUBSTRING(fl.phone_normalized, 1, 4) || SUBSTRING(fl.phone_normalized, 6) = w3.phone_number
            )
            OR (
              LENGTH(fl.phone_normalized) = 12 
              AND LENGTH(w3.phone_number) = 13
              AND fl.phone_normalized = SUBSTRING(w3.phone_number, 1, 4) || SUBSTRING(w3.phone_number, 6)
            )
          )
        ORDER BY w3.created_at DESC 
        LIMIT 1
      ) as last_error
    FROM filtered_leads fl
    LEFT JOIN whatsapp_messages w ON 
      w.message_type = 'template'
      AND (
        -- Match por bitrix_id (prioridade)
        w.bitrix_id = fl.id::text
        -- OU match por telefone exato
        OR w.phone_number = fl.phone_normalized
        -- OU match inteligente: lead tem 13 dígitos (com 9), msg tem 12 (sem 9)
        OR (
          LENGTH(fl.phone_normalized) = 13 
          AND LENGTH(w.phone_number) = 12
          AND SUBSTRING(fl.phone_normalized, 1, 4) || SUBSTRING(fl.phone_normalized, 6) = w.phone_number
        )
        -- OU match inteligente inverso: lead tem 12 dígitos (sem 9), msg tem 13 (com 9)
        OR (
          LENGTH(fl.phone_normalized) = 12 
          AND LENGTH(w.phone_number) = 13
          AND fl.phone_normalized = SUBSTRING(w.phone_number, 1, 4) || SUBSTRING(w.phone_number, 6)
        )
      )
    GROUP BY fl.id
  )
  SELECT 
    fl.id as lead_id,
    fl.name as lead_name,
    fl.phone_normalized,
    fl.address,
    fl.lat,
    fl.lng,
    fl.status,
    fl.photo_url,
    fl.additional_photos,
    fl.created_date,
    fl.scouter as scouter_name,
    COALESCE(ts.send_count, 0) as template_send_count,
    ts.last_status as template_status,
    ts.last_error as template_error_reason
  FROM filtered_leads fl
  LEFT JOIN template_stats ts ON ts.lead_id = fl.id
  ORDER BY fl.created_date DESC;
END;
$$;

-- FASE B: Criar RPC para histórico de templates com match inteligente
CREATE OR REPLACE FUNCTION public.get_scouter_template_history(
  p_lead_id bigint,
  p_phone_normalized text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  created_at timestamp with time zone,
  status text,
  error_reason text,
  template_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.created_at,
    w.status,
    w.error_reason,
    w.template_name
  FROM whatsapp_messages w
  WHERE w.message_type = 'template'
    AND (
      -- Match por bitrix_id (prioridade)
      w.bitrix_id = p_lead_id::text
      -- OU match por telefone exato
      OR w.phone_number = p_phone_normalized
      -- OU match inteligente: lead tem 13 dígitos (com 9), msg tem 12 (sem 9)
      OR (
        LENGTH(p_phone_normalized) = 13 
        AND LENGTH(w.phone_number) = 12
        AND SUBSTRING(p_phone_normalized, 1, 4) || SUBSTRING(p_phone_normalized, 6) = w.phone_number
      )
      -- OU match inteligente inverso: lead tem 12 dígitos (sem 9), msg tem 13 (com 9)
      OR (
        LENGTH(p_phone_normalized) = 12 
        AND LENGTH(w.phone_number) = 13
        AND p_phone_normalized = SUBSTRING(w.phone_number, 1, 4) || SUBSTRING(w.phone_number, 6)
      )
    )
  ORDER BY w.created_at DESC
  LIMIT p_limit;
END;
$$;