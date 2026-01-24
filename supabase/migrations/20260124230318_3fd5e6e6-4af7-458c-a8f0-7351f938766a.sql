
-- Atualizar RPC para excluir leads já em Triagem
CREATE OR REPLACE FUNCTION public.get_failed_scouter_messages(
  p_date_from timestamp with time zone DEFAULT NULL,
  p_date_to timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  lead_id bigint, 
  lead_name text, 
  phone_normalized text, 
  scouter text, 
  criado timestamp with time zone, 
  projeto_comercial text, 
  total_envios bigint, 
  ultimo_erro text, 
  ultimo_erro_at timestamp with time zone, 
  pode_reenviar boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      -- Excluir leads que já estão em Triagem (já foram processados)
      AND l.etapa NOT IN ('Triagem', 'UC_AU7EMM')
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
$function$;

-- Atualizar RPC de contagem também
CREATE OR REPLACE FUNCTION public.get_failed_scouter_messages_count(
  p_date_from timestamp with time zone DEFAULT NULL,
  p_date_to timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  total_com_erro bigint, 
  podem_reenviar bigint, 
  limite_atingido bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      -- Excluir leads que já estão em Triagem (já foram processados)
      AND l.etapa NOT IN ('Triagem', 'UC_AU7EMM')
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
$function$;
