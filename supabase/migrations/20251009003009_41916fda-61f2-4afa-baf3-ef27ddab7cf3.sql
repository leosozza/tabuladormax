-- Remover política existente que bloqueia leitura para agentes
DROP POLICY IF EXISTS "Managers and admins can manage field mappings" ON public.profile_field_mapping;

-- Criar política para permitir SELECT para todos usuários autenticados
CREATE POLICY "All authenticated users can view field mappings"
ON public.profile_field_mapping
FOR SELECT
TO authenticated
USING (true);

-- Criar política para permitir INSERT, UPDATE, DELETE apenas para managers e admins
CREATE POLICY "Managers and admins can manage field mappings"
ON public.profile_field_mapping
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));