-- Script para configurar agentes do Chatwoot no sistema de vínculo
-- Execute este script via Supabase SQL Editor ou linha de comando

-- Exemplo: Configurar lista de agentes Chatwoot
-- Substitua os dados abaixo pelos agentes reais do seu Chatwoot

-- 1. Verificar se já existe configuração
SELECT key, value 
FROM config_kv 
WHERE key = 'chatwoot_agents';

-- 2. Inserir ou atualizar configuração de agentes
INSERT INTO config_kv (key, value) 
VALUES (
  'chatwoot_agents',
  '[
    {
      "id": 1,
      "name": "Agente 1 - Exemplo",
      "email": "agente1@chatwoot.com",
      "role": "agent"
    },
    {
      "id": 2,
      "name": "Agente 2 - Exemplo",
      "email": "agente2@chatwoot.com",
      "role": "agent"
    },
    {
      "id": 3,
      "name": "Supervisor - Exemplo",
      "email": "supervisor@chatwoot.com",
      "role": "administrator"
    }
  ]'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- 3. Verificar configuração inserida
SELECT 
  key, 
  jsonb_pretty(value) as agents_config,
  created_at,
  updated_at
FROM config_kv 
WHERE key = 'chatwoot_agents';

-- 4. Listar todos os agentes configurados
SELECT 
  jsonb_array_elements(value)->>'id' as agent_id,
  jsonb_array_elements(value)->>'name' as agent_name,
  jsonb_array_elements(value)->>'email' as agent_email,
  jsonb_array_elements(value)->>'role' as agent_role
FROM config_kv 
WHERE key = 'chatwoot_agents';

-- 5. Verificar vínculos existentes
SELECT 
  p.id,
  p.email,
  p.display_name,
  p.chatwoot_agent_id,
  p.bitrix_operator_id,
  ur.role as user_role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
ORDER BY p.created_at DESC;

-- 6. Exemplo: Vincular manualmente um usuário a um agente Chatwoot
-- UPDATE profiles 
-- SET chatwoot_agent_id = 1  -- ID do agente
-- WHERE email = 'usuario@example.com';

-- 7. Exemplo: Vincular manualmente um usuário a um operador Bitrix
-- UPDATE profiles 
-- SET bitrix_operator_id = '123'  -- ID do operador do Bitrix
-- WHERE email = 'usuario@example.com';

-- 8. Remover vínculo de um usuário
-- UPDATE profiles 
-- SET chatwoot_agent_id = NULL, bitrix_operator_id = NULL
-- WHERE email = 'usuario@example.com';
