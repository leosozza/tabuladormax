-- =============================================
-- HABILITAR RLS EM TABELAS FALTANTES
-- =============================================

-- Verificar e habilitar RLS em roles (não tinha RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Política de leitura para roles (authenticated pode ler)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles' 
    AND policyname = 'roles_read'
  ) THEN
    CREATE POLICY roles_read ON public.roles
      FOR SELECT 
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Política de admin para roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles' 
    AND policyname = 'roles_admin_all'
  ) THEN
    CREATE POLICY roles_admin_all ON public.roles
      FOR ALL 
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;