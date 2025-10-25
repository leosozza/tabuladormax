-- Seed example permissions
INSERT INTO public.permissions (id, resource, action, label, description)
VALUES
  (gen_random_uuid(), 'admin.users', 'view', 'Ver usuários', 'Acesso para visualizar a lista de usuários'),
  (gen_random_uuid(), 'admin.users', 'manage', 'Gerenciar usuários', 'Criar/editar/excluir usuários'),
  (gen_random_uuid(), 'admin.permissions', 'view', 'Ver permissões', 'Visualizar configuração de permissões')
ON CONFLICT DO NOTHING;

-- Seed example routes
INSERT INTO public.app_routes (id, path, title, name, description, module, active, sort_order)
VALUES
  (gen_random_uuid(), '/admin/users', 'Usuários', 'Usuários', 'Gerenciar usuários do sistema', 'admin', true, 10),
  (gen_random_uuid(), '/admin/permissions', 'Permissões', 'Permissões', 'Configurar permissões e acessos', 'admin', true, 20),
  (gen_random_uuid(), '/admin/agent-mapping', 'Mapeamento', 'Mapeamento de Agentes', 'Mapear agentes entre sistemas', 'admin', true, 30)
ON CONFLICT DO NOTHING;
