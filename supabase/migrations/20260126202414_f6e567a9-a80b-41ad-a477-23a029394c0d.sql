-- Registrar rota /admin/ai-agents na tabela app_routes
INSERT INTO app_routes (path, name, module, description, active)
VALUES ('/admin/ai-agents', 'Agentes de IA', 'admin', 'Gerenciar agentes de IA para WhatsApp', true)
ON CONFLICT (path) DO NOTHING;