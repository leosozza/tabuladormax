-- Atualizar normalize_fonte() com mapeamentos faltantes
CREATE OR REPLACE FUNCTION public.normalize_fonte(raw_fonte text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF raw_fonte IS NULL OR raw_fonte = '' THEN
    RETURN 'Sem Fonte';
  END IF;
  
  -- Mapeamentos diretos do Bitrix (CORRETOS!)
  RETURN CASE raw_fonte
    WHEN 'CALL' THEN 'Scouter - Fichas'
    WHEN 'WEBFORM' THEN 'Meta'
    WHEN 'CALLBACK' THEN 'Google'
    WHEN 'STORE' THEN 'Outros'
    WHEN 'RC_GENERATOR' THEN 'Site'
    WHEN 'BOOKING' THEN 'Agendamento on-line'
    WHEN 'REPEAT_SALE' THEN 'Vendas recorrentes'
    WHEN 'UC_YCY3DY' THEN 'Sem Fonte'
    WHEN 'UC_KLRLDV' THEN 'Instagram'
    WHEN 'UC_7UB0YH' THEN 'Facebook'
    WHEN 'UC_HZW6GM' THEN 'Telefone'
    WHEN 'UC_9CT3Z6' THEN 'Importação Maxsystem'
    WHEN 'UC_AFRLC7' THEN 'MaxSystem - Redes Sociais'
    WHEN 'UC_SJ3VW5' THEN 'Recepção'
    WHEN 'UC_HMANJS' THEN 'Whats Central atendimento'
    WHEN 'UC_U0XJ08' THEN 'Whatsapp'
    WHEN '30' THEN 'Instagram - Formulario de cadastro'
    WHEN '31' THEN 'Confirmação de Cadastro'
    WHEN '12|OPENLINE' THEN 'Pós Cadastro - Scouter'
    WHEN '12|WHATSAPP' THEN 'Whatsapp - Pós Cadastro - Scouter'
    WHEN '26|WHATSAPP' THEN 'Whatsapp - Grupo Ybrasil'
    WHEN '28|WHATSAPP' THEN 'Whatsapp - Requalificação de Lead'
    WHEN '14|OPENLINE' THEN 'Pós Cadastro - Scouter'
    WHEN 'UC_LARJ8X' THEN 'OpenLine'
    -- Se já vier com nome legível, manter
    ELSE raw_fonte
  END;
END;
$function$;