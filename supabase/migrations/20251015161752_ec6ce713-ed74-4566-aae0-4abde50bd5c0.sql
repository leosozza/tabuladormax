-- Fase 1: Corrigir Constraint e Remover Duplicatas

-- Remover roles duplicadas mantendo apenas a mais recente por user_id
DELETE FROM user_roles a
USING user_roles b
WHERE a.id < b.id 
  AND a.user_id = b.user_id;

-- Remover constraint antiga se existir
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Adicionar constraint UNIQUE em user_id apenas (não em user_id + role)
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Fase 2: Corrigir Trigger handle_new_user() para fazer UPSERT correto

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
  
  -- Insert profile (UPSERT para evitar conflitos)
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  
  -- Assign role (UPSERT to prevent duplicates)
  IF first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent')
    ON CONFLICT (user_id) DO NOTHING; -- Não sobrescrever se já existir
  END IF;
  
  RETURN NEW;
END;
$$;