-- =====================================================
-- Recriar get_scouter_portal_stats com campos corretos
-- que o portal espera, mantendo filtro de fonte
-- =====================================================

DROP FUNCTION IF EXISTS public.get_scouter_portal_stats(text, text, text, text);

CREATE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name text,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_project_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_date_from timestamp with time zone;
  v_date_to timestamp with time zone;
BEGIN
  IF p_date_from IS NOT NULL AND p_date_from <> '' THEN
    v_date_from := p_date_from::timestamp with time zone;
  END IF;
  
  IF p_date_to IS NOT NULL AND p_date_to <> '' THEN
    v_date_to := (p_date_to::date + interval '1 day' - interval '1 second')::timestamp with time zone;
  END IF;

  WITH base_leads AS (
    SELECT 
      l.id,
      l.criado,
      l.compareceu,
      l.photo_url,
      l.presenca_confirmada,
      l.data_agendamento,
      l.etapa,
      l.telefone,
      l.phone_normalized
    FROM leads l
    WHERE lower(trim(l.scouter)) = lower(trim(p_scouter_name))
      AND l.fonte = 'Scouter - Fichas'
      AND (v_date_from IS NULL OR l.criado >= v_date_from)
      AND (v_date_to IS NULL OR l.criado <= v_date_to)
      AND (p_project_code IS NULL OR p_project_code = '' OR l.projeto = p_project_code)
  ),
  duplicados_count AS (
    SELECT COUNT(*) as cnt FROM (
      SELECT phone_normalized FROM base_leads 
      WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
      GROUP BY phone_normalized HAVING COUNT(*) > 1
    ) dup
  )
  SELECT jsonb_build_object(
    'total_leads', COUNT(*),
    'com_foto', COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url <> ''),
    'confirmados', COUNT(*) FILTER (WHERE presenca_confirmada = true),
    'agendados', COUNT(*) FILTER (WHERE data_agendamento IS NOT NULL),
    'reagendar', COUNT(*) FILTER (WHERE etapa ILIKE '%reagendar%' OR etapa ILIKE '%retorno%'),
    'compareceram', COUNT(*) FILTER (WHERE compareceu = true),
    'pendentes', COUNT(*) FILTER (WHERE (presenca_confirmada IS NULL OR presenca_confirmada = false) AND (compareceu IS NULL OR compareceu = false)),
    'duplicados', COALESCE((SELECT cnt FROM duplicados_count), 0)
  ) INTO v_result
  FROM base_leads;

  RETURN COALESCE(v_result, jsonb_build_object(
    'total_leads', 0, 'com_foto', 0, 'confirmados', 0, 'agendados', 0,
    'reagendar', 0, 'compareceram', 0, 'pendentes', 0, 'duplicados', 0
  ));
END;
$$;