-- ============================================
-- FASE 1: Criar Sistema de Departamentos
-- ============================================

-- Criar ENUM para departamentos
CREATE TYPE public.app_department AS ENUM ('telemarketing', 'scouter', 'administrativo');

-- Criar tabela user_departments
CREATE TABLE public.user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  department app_department NOT NULL DEFAULT 'telemarketing',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Índices para performance
CREATE INDEX idx_user_departments_user_id ON public.user_departments(user_id);
CREATE INDEX idx_user_departments_department ON public.user_departments(department);

-- Habilitar RLS
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seu próprio departamento
CREATE POLICY "Users can view own department"
  ON public.user_departments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Admins podem gerenciar todos os departamentos
CREATE POLICY "Admins can manage all departments"
  ON public.user_departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_departments_updated_at
  BEFORE UPDATE ON public.user_departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar TODOS os usuários existentes para departamento "telemarketing"
INSERT INTO public.user_departments (user_id, department)
SELECT id, 'telemarketing'::app_department
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Atualizar trigger handle_new_user para incluir departamentos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_user BOOLEAN;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) = 0 INTO first_user FROM auth.users WHERE id != NEW.id;
  
  -- Insert profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  
  -- Assign role
  IF first_user THEN
    -- Primeiro usuário é admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    
    -- Admin tem departamento administrativo por padrão
    INSERT INTO public.user_departments (user_id, department)
    VALUES (NEW.id, 'administrativo')
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Novos usuários são agents
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Usar departamento dos metadados ou telemarketing como padrão
    INSERT INTO public.user_departments (user_id, department)
    VALUES (
      NEW.id, 
      COALESCE(
        (NEW.raw_user_meta_data->>'department')::app_department,
        'telemarketing'::app_department
      )
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;