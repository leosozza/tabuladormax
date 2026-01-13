-- =====================================================
-- FIX: Corrigir RPCs do Portal Scouter para schema atual da tabela leads
-- Problema: funções usavam colunas inexistentes (tem_foto, projeto, etc.)
-- =====================================================

-- Dropar versões existentes para evitar conflitos
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, date, date, text);

DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, text, text, text, text, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, timestamptz, timestamptz, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, timestamptz, timestamptz, text, text, integer, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(text, date, date, text, text, integer, integer, text, text, text);

DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, text, text);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_scouter_ranking_position(text, date, date, text);

DROP FUNCTION IF EXISTS public.get_scouter_timesheet(text, text, text, integer);
DROP FUNCTION IF EXISTS public.get_scouter_timesheet(text, timestamptz, timestamptz, integer);
DROP FUNCTION IF EXISTS public.get_scouter_timesheet(text, date, date, integer);

-- =====================================================
-- 1) get_scouter_portal_stats - Estatísticas do dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_leads BIGINT,
  com_foto BIGINT,
  confirmados BIGINT,
  agendados BIGINT,
  reagendar BIGINT,
  compareceram BIGINT,
  pendentes BIGINT,
  duplicados BIGINT
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
      l.phone_normalized,
      l.criado,
      l.photo_url,
      l.data_confirmacao_ficha,
      l.ficha_confirmada,
      l.data_agendamento,
      l.etapa_funil,
      l.status_fluxo,
      l.compareceu
    FROM leads l
    WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
      AND (v_project_uuid IS NULL OR l.commercial_project_id = v_project_uuid)
  ),
  duplicated_phones AS (
    SELECT bl.phone_normalized
    FROM base_leads bl
    WHERE bl.phone_normalized IS NOT NULL AND bl.phone_normalized <> ''
    GROUP BY bl.phone_normalized
    HAVING COUNT(*) > 1
  )
  SELECT
    COUNT(*)::BIGINT AS total_leads,
    COUNT(*) FILTER (WHERE bl.photo_url IS NOT NULL AND bl.photo_url <> '' AND bl.photo_url <> '[]')::BIGINT AS com_foto,
    COUNT(*) FILTER (WHERE bl.data_confirmacao_ficha IS NOT NULL OR bl.ficha_confirmada = true)::BIGINT AS confirmados,
    COUNT(*) FILTER (WHERE bl.data_agendamento IS NOT NULL)::BIGINT AS agendados,
    COUNT(*) FILTER (WHERE bl.etapa_funil ILIKE '%reagendar%' OR bl.status_fluxo ILIKE '%reagendar%')::BIGINT AS reagendar,
    COUNT(*) FILTER (WHERE bl.compareceu = true)::BIGINT AS compareceram,
    COUNT(*) FILTER (WHERE bl.data_confirmacao_ficha IS NULL AND bl.ficha_confirmada IS NOT TRUE)::BIGINT AS pendentes,
    COUNT(*) FILTER (WHERE bl.phone_normalized IN (SELECT dp.phone_normalized FROM duplicated_phones dp))::BIGINT AS duplicados
  FROM base_leads bl;
END;
$$;

-- =====================================================
-- 2) get_scouter_ranking_position - Posição no ranking
-- Renomeado 'position' para 'rank_position' para evitar conflito com palavra reservada
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_ranking_position(
  p_scouter_name TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL
)
RETURNS TABLE (
  rank_position INTEGER,
  total_leads BIGINT,
  scouter_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
BEGIN
  -- Parse dates
  IF p_date_from IS NOT NULL AND p_date_from <> '' THEN
    v_date_from := p_date_from::TIMESTAMPTZ;
  END IF;
  IF p_date_to IS NOT NULL AND p_date_to <> '' THEN
    v_date_to := p_date_to::TIMESTAMPTZ;
  END IF;

  RETURN QUERY
  WITH scouter_counts AS (
    SELECT 
      lower(trim(l.scouter)) AS scouter_normalized,
      l.scouter AS original_scouter,
      COUNT(*) AS lead_count
    FROM leads l
    WHERE l.scouter IS NOT NULL AND l.scouter <> ''
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
    GROUP BY lower(trim(l.scouter)), l.scouter
  ),
  ranked AS (
    SELECT 
      sc.original_scouter,
      sc.lead_count,
      sc.scouter_normalized,
      ROW_NUMBER() OVER (ORDER BY sc.lead_count DESC) AS rn
    FROM scouter_counts sc
  )
  SELECT 
    r.rn::INTEGER AS rank_position,
    r.lead_count::BIGINT AS total_leads,
    r.original_scouter::TEXT AS scouter_name
  FROM ranked r
  WHERE r.scouter_normalized = lower(trim(p_scouter_name))
  LIMIT 1;
END;
$$;

-- =====================================================
-- 3) get_scouter_leads_simple - Lista de leads com paginação
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'criado',
  p_sort_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE (
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
      l.data_agendamento,
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
        WHEN 'nome_modelo' THEN lw.criado -- fallback, will be overridden
        ELSE lw.criado
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_direction = 'desc' OR p_sort_direction IS NULL THEN
      CASE p_sort_column
        WHEN 'criado' THEN lw.criado
        WHEN 'nome_modelo' THEN lw.criado -- fallback
        ELSE lw.criado
      END
    END DESC NULLS LAST,
    CASE WHEN p_sort_column = 'nome_modelo' AND p_sort_direction = 'asc' THEN lw.nome_modelo END ASC NULLS LAST,
    CASE WHEN p_sort_column = 'nome_modelo' AND (p_sort_direction = 'desc' OR p_sort_direction IS NULL) THEN lw.nome_modelo END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 4) get_scouter_timesheet - Folha de ponto do scouter
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scouter_timesheet(
  p_scouter_name TEXT,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  work_date DATE,
  clock_in TIME,
  clock_out TIME,
  total_leads BIGINT,
  hours_worked NUMERIC,
  projects TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Parse dates
  IF p_start_date IS NOT NULL AND p_start_date <> '' THEN
    v_start_date := p_start_date::TIMESTAMPTZ;
  END IF;
  IF p_end_date IS NOT NULL AND p_end_date <> '' THEN
    v_end_date := p_end_date::TIMESTAMPTZ;
  END IF;

  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(l.criado) AS wd,
      MIN(l.criado::TIME) AS ci,
      MAX(l.criado::TIME) AS co,
      COUNT(*) AS tl,
      EXTRACT(EPOCH FROM (MAX(l.criado) - MIN(l.criado))) / 3600 AS hw,
      STRING_AGG(DISTINCT COALESCE(l.projeto_comercial, cp.name, 'Sem Projeto'), ', ') AS pr
    FROM leads l
    LEFT JOIN commercial_projects cp ON l.commercial_project_id = cp.id
    WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
      AND (v_start_date IS NULL OR l.criado >= v_start_date)
      AND (v_end_date IS NULL OR l.criado <= v_end_date)
    GROUP BY DATE(l.criado)
  )
  SELECT 
    ds.wd AS work_date,
    ds.ci AS clock_in,
    ds.co AS clock_out,
    ds.tl AS total_leads,
    ROUND(ds.hw::NUMERIC, 2) AS hours_worked,
    ds.pr AS projects
  FROM daily_stats ds
  ORDER BY ds.wd DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 5) Garantir índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_leads_scouter_lower_trim ON leads ((lower(trim(scouter))));
CREATE INDEX IF NOT EXISTS idx_leads_criado ON leads (criado);
CREATE INDEX IF NOT EXISTS idx_leads_commercial_project_id ON leads (commercial_project_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON leads (phone_normalized);

-- Grants
GRANT EXECUTE ON FUNCTION public.get_scouter_portal_stats(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scouter_ranking_position(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scouter_leads_simple(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scouter_timesheet(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;