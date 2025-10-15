-- Corrigir política de admin removendo recursão completa
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Criar política sem recursão usando apenas auth.uid()
CREATE POLICY "Admins can manage all roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  -- Admin pode ver/gerenciar tudo se sua própria role for admin
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);