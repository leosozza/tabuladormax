-- Registrar rota no app_routes (sem role_routes que não existe)
INSERT INTO app_routes (path, name, module, description, active)
VALUES ('/admin/database-maintenance', 'Manutenção do Banco', 'admin', 'Limpeza e otimização do banco de dados', true)
ON CONFLICT (path) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = EXCLUDED.active;