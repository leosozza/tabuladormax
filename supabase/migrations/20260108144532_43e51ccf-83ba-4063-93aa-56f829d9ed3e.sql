-- Limpar duplicatas de automação Bitrix que foram criadas erroneamente
-- quando já existe uma mensagem real enviada pelo bitrix-template-webhook

DELETE FROM whatsapp_messages
WHERE id IN (
  SELECT wm1.id
  FROM whatsapp_messages wm1
  WHERE wm1.sent_by = 'bitrix_automation'
    AND wm1.content LIKE '%Template enviado via automação%'
    AND EXISTS (
      SELECT 1 FROM whatsapp_messages wm2
      WHERE wm2.phone_number = wm1.phone_number
        AND wm2.sent_by = 'bitrix'
        AND wm2.direction = 'outbound'
        AND wm2.created_at < wm1.created_at
        AND wm1.created_at < wm2.created_at + interval '30 seconds'
        AND wm2.template_name IS NOT NULL
    )
);