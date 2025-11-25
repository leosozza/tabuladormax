-- Criar função para normalizar etapa (IDs técnicos → nomes legíveis)
CREATE OR REPLACE FUNCTION public.normalize_etapa(raw_etapa text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF raw_etapa IS NULL OR raw_etapa = '' THEN
    RETURN NULL;
  END IF;
  
  -- Mapeamentos diretos do Bitrix (STATUS_ID → NAME)
  RETURN CASE raw_etapa
    WHEN 'UC_AU7EMM' THEN 'Triagem'
    WHEN 'UC_DDVFX3' THEN 'Lead a Qualificar'
    WHEN 'UC_8WYI7Q' THEN 'StandyBy'
    WHEN 'UC_SARR07' THEN 'Em agendamento'
    WHEN 'UC_MWJM5G' THEN 'Retornar Ligação'
    WHEN 'UC_QWPO2W' THEN 'Agendados'
    WHEN 'UC_DMLQB7' THEN 'Reagendar'
    WHEN 'NEW' THEN 'nativo'
    WHEN 'UC_DIEP95' THEN 'Leads a Qualificar - META'
    WHEN 'UC_ON6WVP' THEN 'Fichas Formulario de internet'
    WHEN 'CONVERTED' THEN 'Lead convertido'
    WHEN 'UC_EEE2MB' THEN 'Banco de Leads'
    WHEN 'UC_GPH3PL' THEN 'Analizar - Sem interesse'
    WHEN '1' THEN 'Analizar - Não Confirmados'
    WHEN 'JUNK' THEN 'Excluir Lead'
    -- Se já estiver com nome legível, manter
    ELSE raw_etapa
  END;
END;
$function$;

-- Criar função para processar um único lote de etapa normalizada
CREATE OR REPLACE FUNCTION public.normalize_etapa_single_batch(p_batch_size INT DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INT;
BEGIN
  -- Atualizar um lote de leads onde etapa está diferente do normalizado
  WITH batch AS (
    SELECT id FROM leads
    WHERE etapa IS DISTINCT FROM normalize_etapa(etapa)
    LIMIT p_batch_size
  )
  UPDATE leads l
  SET etapa = normalize_etapa(l.etapa),
      updated_at = NOW()
  FROM batch b
  WHERE l.id = b.id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Retornar quantos foram atualizados e se há mais para processar
  RETURN jsonb_build_object(
    'updated', v_updated,
    'has_more', v_updated = p_batch_size
  );
END;
$function$;