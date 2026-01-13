-- Fix get_scouter_leads_simple: align data_agendamento type (leads.data_agendamento is DATE)
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name text,
  p_date_from text DEFAULT NULL::text,
  p_date_to text DEFAULT NULL::text,
  p_project_id text DEFAULT NULL::text,
  p_filter_type text DEFAULT 'all'::text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL::text,
  p_sort_column text DEFAULT 'criado'::text,
  p_sort_direction text DEFAULT 'desc'::text
)
RETURNS TABLE(
  lead_id integer,
  nome_modelo text,
  nome_responsavel text,
  criado timestamp with time zone,
  celular text,
  address text,
  photo_url text,
  phone_normalized text,
  ficha_confirmada boolean,
  data_agendamento timestamp with time zone,
  etapa_funil text,
  compareceu boolean,
  projeto_comercial text,
  template_send_count bigint,
  template_status text,
  template_error_reason text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
  v_project_uuid UUID;
BEGIN
  -- Parse dates
  IF p_date_from IS NOT NULL AND p_date_from <> '' THEN
    v_date_from := p_date_from::TIMESTAMPTZ;
  END IF;
  IF p_date_to IS NOT NULL AND p_date_to <> '' THEN
    v_date_to := p_date_to::TIMESTAMPTZ;
  END IF;

  -- Parse project_id
  IF p_project_id IS NOT NULL AND p_project_id <> '' THEN
    BEGIN
      v_project_uuid := p_project_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_project_uuid := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH base_leads AS (
    SELECT 
      l.id,
      l.nome_modelo,
      COALESCE(l.name, l.responsible, '') AS nome_resp,
      l.criado,
      COALESCE(l.celular, l.telefone_casa, l.telefone_trabalho, '') AS cel,
      l.address,
      l.photo_url,
      l.phone_normalized,
      COALESCE(l.ficha_confirmada, l.data_confirmacao_ficha IS NOT NULL) AS is_confirmed,
      (l.data_agendamento::timestamptz) AS data_agendamento,
      l.etapa_funil,
      l.status_fluxo,
      l.compareceu,
      COALESCE(l.projeto_comercial, cp.name, '') AS proj_comercial,
      l.data_confirmacao_ficha
    FROM leads l
    LEFT JOIN commercial_projects cp ON l.commercial_project_id = cp.id
    WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
      AND (v_project_uuid IS NULL OR l.commercial_project_id = v_project_uuid)
      -- Search filter
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR l.nome_modelo ILIKE '%' || p_search || '%'
        OR COALESCE(l.name, l.responsible, '') ILIKE '%' || p_search || '%'
        OR l.id::TEXT = p_search
      )
  ),
  filtered_leads AS (
    SELECT bl.*
    FROM base_leads bl
    WHERE 
      CASE p_filter_type
        WHEN 'com_foto' THEN bl.photo_url IS NOT NULL AND bl.photo_url <> '' AND bl.photo_url <> '[]'
        WHEN 'confirmados' THEN bl.data_confirmacao_ficha IS NOT NULL OR bl.is_confirmed = true
        WHEN 'agendados' THEN bl.data_agendamento IS NOT NULL
        WHEN 'reagendar' THEN bl.etapa_funil ILIKE '%reagendar%' OR bl.status_fluxo ILIKE '%reagendar%'
        WHEN 'compareceram' THEN bl.compareceu = true
        WHEN 'pendentes' THEN bl.data_confirmacao_ficha IS NULL AND bl.is_confirmed IS NOT TRUE
        WHEN 'duplicados' THEN bl.phone_normalized IN (
          SELECT bl2.phone_normalized 
          FROM base_leads bl2 
          WHERE bl2.phone_normalized IS NOT NULL AND bl2.phone_normalized <> ''
          GROUP BY bl2.phone_normalized 
          HAVING COUNT(*) > 1
        )
        ELSE true -- 'all' or any other value
      END
  ),
  lead_with_whatsapp AS (
    SELECT 
      fl.*,
      COALESCE(wm.send_count, 0) AS tmpl_send_count,
      wm.last_status AS tmpl_status,
      wm.last_error AS tmpl_error
    FROM filtered_leads fl
    LEFT JOIN LATERAL (
      SELECT 
        COUNT(*) AS send_count,
        (SELECT w.status FROM whatsapp_messages w WHERE w.bitrix_id = fl.id::TEXT AND w.direction = 'outbound' AND w.message_type = 'template' ORDER BY w.created_at DESC LIMIT 1) AS last_status,
        (SELECT w.metadata->'payload'->>'reason' FROM whatsapp_messages w WHERE w.bitrix_id = fl.id::TEXT AND w.direction = 'outbound' AND w.message_type = 'template' ORDER BY w.created_at DESC LIMIT 1) AS last_error
      FROM whatsapp_messages w
      WHERE w.bitrix_id = fl.id::TEXT AND w.direction = 'outbound' AND w.message_type = 'template'
    ) wm ON true
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM lead_with_whatsapp
  )
  SELECT 
    lw.id::INTEGER AS lead_id,
    lw.nome_modelo::TEXT,
    lw.nome_resp::TEXT AS nome_responsavel,
    lw.criado,
    lw.cel::TEXT AS celular,
    lw.address::TEXT,
    lw.photo_url::TEXT,
    lw.phone_normalized::TEXT,
    lw.is_confirmed AS ficha_confirmada,
    lw.data_agendamento,
    lw.etapa_funil::TEXT,
    lw.compareceu,
    lw.proj_comercial::TEXT AS projeto_comercial,
    lw.tmpl_send_count::BIGINT AS template_send_count,
    lw.tmpl_status::TEXT AS template_status,
    lw.tmpl_error::TEXT AS template_error_reason,
    (SELECT cnt FROM counted)::BIGINT AS total_count
  FROM lead_with_whatsapp lw
  ORDER BY
    CASE WHEN p_sort_direction = 'asc' THEN
      CASE p_sort_column
        WHEN 'criado' THEN lw.criado
        WHEN 'nome_modelo' THEN lw.criado -- fallback, overridden below
        ELSE lw.criado
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_direction = 'desc' OR p_sort_direction IS NULL THEN
      CASE p_sort_column
        WHEN 'criado' THEN lw.criado
        WHEN 'nome_modelo' THEN lw.criado -- fallback, overridden below
        ELSE lw.criado
      END
    END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'nome_modelo' AND p_sort_direction = 'asc' THEN lw.nome_modelo END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'nome_modelo' AND (p_sort_direction = 'desc' OR p_sort_direction IS NULL) THEN lw.nome_modelo END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;