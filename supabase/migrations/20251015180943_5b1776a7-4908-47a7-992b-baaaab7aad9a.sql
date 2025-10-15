-- Remover política antiga que só permite atualizar próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Criar política que permite admins atualizarem qualquer perfil
CREATE POLICY "Users can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role)
);