-- Adicionar status do template WhatsApp na função get_scouter_leads_simple
DROP FUNCTION IF EXISTS public.get_scouter_leads_simple(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_scouter_leads_simple(
  p_scouter_name TEXT,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_filter_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  lead_id BIGINT,
  nome_modelo TEXT,
  nome_responsavel TEXT,
  criado TIMESTAMPTZ,
  celular TEXT,
  address TEXT,
  photo_url TEXT,
  phone_normalized TEXT,
  ficha_confirmada BOOLEAN,
  template_status TEXT,
  template_error_reason TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id as lead_id,
    l.nome_modelo::TEXT,
    l.name::TEXT as nome_responsavel,
    l.criado,
    l.celular::TEXT,
    l.local_abordagem::TEXT as address,
    l.photo_url::TEXT,
    l.phone_normalized::TEXT,
    (l.data_confirmacao_ficha IS NOT NULL) as ficha_confirmada,
    -- Status do último template WhatsApp enviado
    latest_template.status as template_status,
    latest_template.error_reason as template_error_reason
  FROM leads l
  LEFT JOIN LATERAL (
    SELECT 
      wm.status::TEXT,
      (wm.metadata->'payload'->>'reason')::TEXT as error_reason
    FROM whatsapp_messages wm
    WHERE wm.bitrix_id = l.id::text
      AND wm.direction = 'outbound'
      AND wm.message_type = 'template'
    ORDER BY wm.created_at DESC
    LIMIT 1
  ) latest_template ON true
  WHERE l.scouter = p_scouter_name
    AND (p_date_from IS NULL OR l.criado >= p_date_from)
    AND (p_date_to IS NULL OR l.criado <= p_date_to)
    AND (p_project_id IS NULL OR l.commercial_project_id = p_project_id)
    AND (
      -- Todos
      p_filter_type = 'all'
      
      -- Com Foto
      OR (p_filter_type = 'com_foto' AND 
          l.photo_url IS NOT NULL AND 
          l.photo_url != '' AND 
          l.photo_url != '[]')
      
      -- Confirmados (usando data_confirmacao_ficha)
      OR (p_filter_type = 'confirmados' AND l.data_confirmacao_ficha IS NOT NULL)
      
      -- Agendados
      OR (p_filter_type = 'agendados' AND l.data_agendamento IS NOT NULL)
      
      -- Reagendar
      OR (p_filter_type = 'reagendar' AND 
          (l.etapa_funil ILIKE '%reagendar%' OR l.status_fluxo ILIKE '%reagendar%'))
      
      -- Compareceram
      OR (p_filter_type = 'compareceram' AND l.compareceu = true)
      
      -- Pendentes (data_confirmacao_ficha NULL)
      OR (p_filter_type = 'pendentes' AND l.data_confirmacao_ficha IS NULL)
      
      -- Duplicados
      OR (p_filter_type = 'duplicados' AND 
          l.phone_normalized IS NOT NULL AND 
          l.phone_normalized != '' AND
          LENGTH(l.phone_normalized) >= 8 AND
          EXISTS (
            SELECT 1 FROM leads other
            WHERE other.id != l.id
              AND other.phone_normalized = l.phone_normalized
              AND other.criado >= NOW() - INTERVAL '60 days'
          ))
    )
  ORDER BY l.criado DESC;
END;
$$;

COMMENT ON FUNCTION public.get_scouter_leads_simple IS 
'Retorna leads de um scouter com filtros e status do template WhatsApp.
Campos template_status e template_error_reason indicam se o template foi enviado com sucesso ou o motivo do erro.';