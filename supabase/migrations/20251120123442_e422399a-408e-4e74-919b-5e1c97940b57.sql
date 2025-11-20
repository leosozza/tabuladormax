-- FASE 1.1: Desativar mapeamento problemático de commercial_project_id
-- O campo commercial_project_id deve vir apenas da resolução SPA (UUID)
-- e não do campo Bitrix UF_CRM_1741215746 (que contém código "4")
UPDATE unified_field_config
SET 
  sync_active = false,
  notes = 'Desativado: commercial_project_id deve vir da resolução SPA (UUID), não do campo Bitrix bruto',
  updated_at = now()
WHERE 
  supabase_field = 'commercial_project_id'
  AND bitrix_field = 'UF_CRM_1741215746';

-- FASE 3.2: Adicionar política RLS explícita para sync_events
-- Garante que admins/managers/supervisors possam visualizar eventos
DROP POLICY IF EXISTS "Admins managers supervisors can view sync events (direct)" ON sync_events;

CREATE POLICY "Admins managers supervisors can view sync events (direct)"
ON public.sync_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager', 'supervisor')
  )
);

-- Criar índice para melhorar performance da query RLS
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
  ON user_roles(user_id, role);