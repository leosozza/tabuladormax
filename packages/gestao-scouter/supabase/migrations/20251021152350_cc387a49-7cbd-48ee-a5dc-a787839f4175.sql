-- ============================================================================
-- Migration: Sincronizar auth.users com public.users e user_roles
-- ============================================================================
-- Esta migration cria usuários admin iniciais baseados em auth.users
-- Necessário para desbloquear UsersPanel e PermissionsPanel
-- ============================================================================

-- 1. Inserir usuários do auth.users na tabela public.users
INSERT INTO public.users (id, name, email, role_id)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name,
  email,
  1 as role_id -- admin role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 2. Criar user_roles para admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar resultado
DO $$
DECLARE
  user_count INTEGER;
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  SELECT COUNT(*) INTO role_count FROM public.user_roles WHERE role = 'admin';
  
  RAISE NOTICE '✅ Migration concluída:';
  RAISE NOTICE '   - % usuário(s) em public.users', user_count;
  RAISE NOTICE '   - % admin role(s) criada(s)', role_count;
END $$;