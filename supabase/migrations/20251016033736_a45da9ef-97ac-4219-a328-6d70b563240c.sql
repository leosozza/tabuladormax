-- Adicionar política de INSERT para sync_events
CREATE POLICY "Service can insert sync events"
ON sync_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Atualizar política de SELECT para incluir managers e supervisores
DROP POLICY IF EXISTS "Admins can view sync events" ON sync_events;

CREATE POLICY "Privileged users can view sync events"
ON sync_events FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'supervisor')
);