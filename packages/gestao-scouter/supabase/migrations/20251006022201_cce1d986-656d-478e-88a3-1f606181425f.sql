-- Correção de segurança: Remover SECURITY DEFINER da view e adicionar RLS policies para fichas

-- 1. Recriar view sem SECURITY DEFINER
DROP VIEW IF EXISTS public.user_permissions;
CREATE VIEW public.user_permissions AS
SELECT 
  u.id AS user_id, 
  u.name AS user_name,
  r.name AS role, 
  p.module, 
  p.action, 
  p.allowed
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
JOIN public.permissions p ON p.role_id = r.id;

-- 2. Adicionar RLS policies detalhadas para fichas baseadas em roles
-- Drop policies antigas se existirem
DROP POLICY IF EXISTS "fichas_scouter_policy" ON public.fichas;
DROP POLICY IF EXISTS "fichas_supervisor_policy" ON public.fichas;
DROP POLICY IF EXISTS "fichas_admin_policy" ON public.fichas;

-- 3. Policy para Scouters (apenas suas próprias fichas)
CREATE POLICY "Scouters can view their own fichas"
ON public.fichas FOR SELECT
USING (
  EXISTS(
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND public.get_user_role(auth.uid()) = 'scouter'
      AND fichas.scouter = u.name
  )
);

CREATE POLICY "Scouters can create their own fichas"
ON public.fichas FOR INSERT
WITH CHECK (
  public.has_permission(auth.uid(), 'fichas', 'create')
);

CREATE POLICY "Scouters can update their own fichas"
ON public.fichas FOR UPDATE
USING (
  EXISTS(
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND public.get_user_role(auth.uid()) = 'scouter'
      AND fichas.scouter = u.name
  )
  AND public.has_permission(auth.uid(), 'fichas', 'update')
);

-- 4. Policy para Supervisores (ver fichas da equipe)
CREATE POLICY "Supervisors can view team fichas"
ON public.fichas FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'supervisor'
  AND public.has_permission(auth.uid(), 'fichas', 'read')
);

CREATE POLICY "Supervisors can manage team fichas"
ON public.fichas FOR ALL
USING (
  public.get_user_role(auth.uid()) = 'supervisor'
);

-- 5. Policy para Admins (acesso total)
CREATE POLICY "Admins have full access to fichas"
ON public.fichas FOR ALL
USING (
  public.get_user_role(auth.uid()) = 'admin'
);