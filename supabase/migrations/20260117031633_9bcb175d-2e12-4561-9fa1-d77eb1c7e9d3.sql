
-- Correção da RPC get_scouter_leads_simple (versão com p_project_id, p_filter_type)
-- Adiciona match inteligente de telefone brasileiro (variação do 9º dígito)

CREATE OR REPLACE FUNCTION get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_filter_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'criado',
  p_sort_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  lead_id INTEGER,
  nome_modelo TEXT,
  nome_responsavel TEXT,
  criado TIMESTAMPTZ,
  celular TEXT,
  address TEXT,
  photo_url TEXT,
  phone_normalized TEXT,
  ficha_confirmada BOOLEAN,
  data_agendamento TIMESTAMPTZ,
  etapa_funil TEXT,
  compareceu BOOLEAN,
  projeto_comercial TEXT,
  template_send_count BIGINT,
  template_status TEXT,
  template_error_reason TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        -- Buscar último status com match inteligente de telefone
        (
          SELECT w.status 
          FROM whatsapp_messages w 
          WHERE w.direction = 'outbound' 
            AND w.message_type = 'template' 
            AND (
              -- Priority 1: Match by bitrix_id
              w.bitrix_id = fl.id::TEXT 
              OR (
                -- Priority 2: Phone matching when bitrix_id is null
                w.bitrix_id IS NULL 
                AND (
                  -- Exact match
                  w.phone_number = fl.phone_normalized
                  -- Lead has 13 digits (with 9), message has 12 (without 9)
                  OR (
                    LENGTH(fl.phone_normalized) = 13 
                    AND LENGTH(w.phone_number) = 12
                    AND SUBSTRING(fl.phone_normalized, 1, 4) || SUBSTRING(fl.phone_normalized, 6) = w.phone_number
                  )
                  -- Lead has 12 digits (without 9), message has 13 (with 9)
                  OR (
                    LENGTH(fl.phone_normalized) = 12 
                    AND LENGTH(w.phone_number) = 13
                    AND fl.phone_normalized = SUBSTRING(w.phone_number, 1, 4) || SUBSTRING(w.phone_number, 6)
                  )
                )
              )
            )
          ORDER BY 
            CASE WHEN w.bitrix_id = fl.id::TEXT THEN 0 ELSE 1 END,
            w.created_at DESC 
          LIMIT 1
        ) AS last_status,
        -- Buscar último erro com match inteligente de telefone
        (
          SELECT w.metadata->'payload'->>'reason' 
          FROM whatsapp_messages w 
          WHERE w.direction = 'outbound' 
            AND w.message_type = 'template' 
            AND (
              -- Priority 1: Match by bitrix_id
              w.bitrix_id = fl.id::TEXT 
              OR (
                -- Priority 2: Phone matching when bitrix_id is null
                w.bitrix_id IS NULL 
                AND (
                  -- Exact match
                  w.phone_number = fl.phone_normalized
                  -- Lead has 13 digits (with 9), message has 12 (without 9)
                  OR (
                    LENGTH(fl.phone_normalized) = 13 
                    AND LENGTH(w.phone_number) = 12
                    AND SUBSTRING(fl.phone_normalized, 1, 4) || SUBSTRING(fl.phone_normalized, 6) = w.phone_number
                  )
                  -- Lead has 12 digits (without 9), message has 13 (with 9)
                  OR (
                    LENGTH(fl.phone_normalized) = 12 
                    AND LENGTH(w.phone_number) = 13
                    AND fl.phone_normalized = SUBSTRING(w.phone_number, 1, 4) || SUBSTRING(w.phone_number, 6)
                  )
                )
              )
            )
          ORDER BY 
            CASE WHEN w.bitrix_id = fl.id::TEXT THEN 0 ELSE 1 END,
            w.created_at DESC 
          LIMIT 1
        ) AS last_error
      FROM whatsapp_messages w
      WHERE w.direction = 'outbound' 
        AND w.message_type = 'template'
        AND (
          -- Priority 1: Match by bitrix_id
          w.bitrix_id = fl.id::TEXT 
          OR (
            -- Priority 2: Phone matching when bitrix_id is null
            w.bitrix_id IS NULL 
            AND (
              -- Exact match
              w.phone_number = fl.phone_normalized
              -- Lead has 13 digits (with 9), message has 12 (without 9)
              OR (
                LENGTH(fl.phone_normalized) = 13 
                AND LENGTH(w.phone_number) = 12
                AND SUBSTRING(fl.phone_normalized, 1, 4) || SUBSTRING(fl.phone_normalized, 6) = w.phone_number
              )
              -- Lead has 12 digits (without 9), message has 13 (with 9)
              OR (
                LENGTH(fl.phone_normalized) = 12 
                AND LENGTH(w.phone_number) = 13
                AND fl.phone_normalized = SUBSTRING(w.phone_number, 1, 4) || SUBSTRING(w.phone_number, 6)
              )
            )
          )
        )
    ) wm ON true
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM lead_with_whatsapp
  )
  SELECT 
    lw.id AS lead_id,
    lw.nome_modelo,
    lw.nome_resp AS nome_responsavel,
    lw.criado,
    lw.cel AS celular,
    lw.address,
    lw.photo_url,
    lw.phone_normalized,
    lw.is_confirmed AS ficha_confirmada,
    lw.data_agendamento,
    lw.etapa_funil,
    lw.compareceu,
    lw.proj_comercial AS projeto_comercial,
    lw.tmpl_send_count AS template_send_count,
    lw.tmpl_status AS template_status,
    lw.tmpl_error AS template_error_reason,
    t.cnt AS total_count
  FROM lead_with_whatsapp lw
  CROSS JOIN total t
  ORDER BY 
    CASE WHEN p_sort_column = 'criado' AND p_sort_direction = 'desc' THEN lw.criado END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'criado' AND p_sort_direction = 'asc' THEN lw.criado END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'nome_modelo' AND p_sort_direction = 'desc' THEN lw.nome_modelo END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'nome_modelo' AND p_sort_direction = 'asc' THEN lw.nome_modelo END ASC NULLS LAST,
    lw.criado DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
