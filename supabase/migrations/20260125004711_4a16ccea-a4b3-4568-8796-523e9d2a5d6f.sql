-- Fase 1.1: Remover underscore dos bitrix_id existentes
UPDATE whatsapp_messages 
SET bitrix_id = REGEXP_REPLACE(bitrix_id, '_$', '')
WHERE bitrix_id LIKE '%\_';

-- Fase 1.2: Preencher bitrix_id faltantes baseado no telefone
-- Usa o lead mais recente quando há múltiplos para o mesmo telefone
UPDATE whatsapp_messages wm
SET bitrix_id = subq.lead_id::text
FROM (
  SELECT DISTINCT ON (wm2.id) 
    wm2.id as msg_id,
    l.id as lead_id
  FROM whatsapp_messages wm2
  INNER JOIN leads l ON l.phone_normalized = wm2.phone_number
  WHERE wm2.bitrix_id IS NULL
    AND wm2.phone_number IS NOT NULL
    AND l.phone_normalized IS NOT NULL
  ORDER BY wm2.id, l.criado DESC
) subq
WHERE wm.id = subq.msg_id;

-- Fase 2: Atualizar chatwoot_contacts também
UPDATE chatwoot_contacts cc
SET bitrix_id = subq.lead_id::text
FROM (
  SELECT DISTINCT ON (cc2.id) 
    cc2.id as contact_id,
    l.id as lead_id
  FROM chatwoot_contacts cc2
  INNER JOIN leads l ON l.phone_normalized = cc2.phone_number
  WHERE (cc2.bitrix_id IS NULL OR cc2.bitrix_id !~ '^[0-9]+$')
    AND cc2.phone_number IS NOT NULL
    AND l.phone_normalized IS NOT NULL
  ORDER BY cc2.id, l.criado DESC
) subq
WHERE cc.id = subq.contact_id;

-- Fase 3: Refresh da Materialized View
REFRESH MATERIALIZED VIEW mv_whatsapp_conversation_stats;