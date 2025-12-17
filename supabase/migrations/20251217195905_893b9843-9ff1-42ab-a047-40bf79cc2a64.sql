-- Inserir o flow de exemplo "Enviar Credencial"
INSERT INTO public.flows (id, nome, descricao, ativo, steps, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Enviar Credencial',
  'Envia credencial + instruções quando cliente clica no botão "Receber Credencial"',
  true,
  '[
    {
      "id": "step_1",
      "type": "bitrix_get_field",
      "nome": "Buscar URL da Credencial",
      "descricao": "Busca o campo UF_CRM_1762971213 do lead",
      "config": {
        "field_name": "UF_CRM_1762971213",
        "variable_name": "credencial_url"
      }
    },
    {
      "id": "step_2",
      "type": "gupshup_send_image",
      "nome": "Enviar Imagem da Credencial",
      "descricao": "Envia a credencial como imagem",
      "config": {
        "image_url": "{{credencial_url}}",
        "caption": "🎟️ Aqui está sua credencial!"
      }
    },
    {
      "id": "step_3",
      "type": "wait",
      "nome": "Aguardar 3 segundos",
      "descricao": "Pausa antes de enviar instruções",
      "config": {
        "duration_ms": 3000
      }
    },
    {
      "id": "step_4",
      "type": "gupshup_send_text",
      "nome": "Enviar Instruções",
      "descricao": "Envia texto com informações importantes",
      "config": {
        "text": "📋 *Importante:*\n\n• Levar 4 trocas de roupas e 2 pares de calçados.\n• Trazer documentos (RG, CPF ou certidão) do modelo e do responsável.\n\nTe esperamos por lá! ☺"
      }
    },
    {
      "id": "step_5",
      "type": "wait",
      "nome": "Aguardar 2 segundos",
      "descricao": "Pausa antes dos botões",
      "config": {
        "duration_ms": 2000
      }
    },
    {
      "id": "step_6",
      "type": "gupshup_send_buttons",
      "nome": "Enviar Botões de Ação",
      "descricao": "Oferece opções ao cliente",
      "config": {
        "text": "Precisa de algo mais?",
        "buttons": ["Ver agenda", "Falar com atendente"]
      }
    }
  ]'::jsonb,
  now(),
  now()
);

-- Inserir o trigger associado ao flow
INSERT INTO public.flow_triggers (id, flow_id, trigger_type, trigger_config, ativo, created_at, updated_at)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'button_click',
  '{"button_text": "Receber Credencial"}'::jsonb,
  true,
  now(),
  now()
);