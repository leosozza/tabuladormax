-- RPC para buscar contagem de leads com erro de envio
CREATE OR REPLACE FUNCTION public.get_failed_scouter_messages_count(
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_com_erro BIGINT,
  podem_reenviar BIGINT,
  limite_atingido BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH failed_leads AS (
    SELECT DISTINCT ON (l.id)
      l.id,
      (SELECT COUNT(*) FROM whatsapp_messages w2 
       WHERE w2.phone_number = l.phone_normalized 
       AND w2.direction = 'outbound' 
       AND w2.message_type = 'template') as send_count
    FROM leads l
    JOIN whatsapp_messages w ON w.phone_number = l.phone_normalized
    WHERE l.fonte = 'Scouter - Fichas'
      AND w.direction = 'outbound'
      AND w.message_type = 'template'
      AND w.status = 'failed'
      AND w.metadata->'payload'->>'reason' ILIKE '%low balance%'
      AND (p_date_from IS NULL OR l.criado >= p_date_from)
      AND (p_date_to IS NULL OR l.criado <= p_date_to)
    ORDER BY l.id
  )
  SELECT 
    COUNT(*)::BIGINT AS total_com_erro,
    COUNT(*) FILTER (WHERE send_count < 2)::BIGINT AS podem_reenviar,
    COUNT(*) FILTER (WHERE send_count >= 2)::BIGINT AS limite_atingido
  FROM failed_leads;
END;
$$;

-- RPC para buscar lista de leads com erro de envio
CREATE OR REPLACE FUNCTION public.get_failed_scouter_messages(
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  lead_id BIGINT,
  lead_name TEXT,
  phone_normalized TEXT,
  scouter TEXT,
  criado TIMESTAMPTZ,
  projeto_comercial TEXT,
  total_envios BIGINT,
  ultimo_erro TEXT,
  ultimo_erro_at TIMESTAMPTZ,
  pode_reenviar BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH failed_leads AS (
    SELECT DISTINCT ON (l.id)
      l.id,
      l.name,
      l.phone_normalized as phone,
      l.scouter,
      l.criado,
      cp.name as projeto,
      (SELECT COUNT(*) FROM whatsapp_messages w2 
       WHERE w2.phone_number = l.phone_normalized 
       AND w2.direction = 'outbound' 
       AND w2.message_type = 'template') as send_count,
      w.metadata->'payload'->>'reason' as error_reason,
      w.created_at as error_at
    FROM leads l
    LEFT JOIN commercial_projects cp ON cp.id = l.commercial_project_id
    JOIN whatsapp_messages w ON w.phone_number = l.phone_normalized
    WHERE l.fonte = 'Scouter - Fichas'
      AND w.direction = 'outbound'
      AND w.message_type = 'template'
      AND w.status = 'failed'
      AND w.metadata->'payload'->>'reason' ILIKE '%low balance%'
      AND (p_date_from IS NULL OR l.criado >= p_date_from)
      AND (p_date_to IS NULL OR l.criado <= p_date_to)
    ORDER BY l.id, w.created_at DESC
  )
  SELECT 
    fl.id AS lead_id,
    fl.name::TEXT AS lead_name,
    fl.phone::TEXT AS phone_normalized,
    fl.scouter::TEXT,
    fl.criado,
    fl.projeto::TEXT AS projeto_comercial,
    fl.send_count AS total_envios,
    fl.error_reason::TEXT AS ultimo_erro,
    fl.error_at AS ultimo_erro_at,
    (fl.send_count < 2) AS pode_reenviar
  FROM failed_leads fl
  ORDER BY fl.criado DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;