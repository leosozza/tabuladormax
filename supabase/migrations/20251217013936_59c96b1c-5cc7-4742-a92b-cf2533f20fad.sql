-- =====================================================
-- CORREÇÃO RLS LEADS PARA PRODUÇÃO
-- Corrige a política de UPDATE que comparava UUID com nome
-- =====================================================

-- Remover política antiga de UPDATE (comparava auth.uid() com 'responsible' que é nome)
DROP POLICY IF EXISTS "Users can update accessible leads" ON leads;

-- Criar nova política de UPDATE corrigida
-- Usa bitrix_telemarketing_id para agents e commercial_project_id para supervisors
CREATE POLICY "Users can update accessible leads" ON leads
FOR UPDATE TO authenticated
USING (
  -- Admins e managers podem atualizar qualquer lead
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  -- Supervisors podem atualizar leads do seu projeto comercial
  OR (
    has_role(auth.uid(), 'supervisor'::app_role) AND (
      commercial_project_id IN (
        SELECT atm.commercial_project_id 
        FROM agent_telemarketing_mapping atm
        WHERE atm.tabuladormax_user_id = auth.uid()
      )
    )
  )
  -- Agents (telemarketing) podem atualizar leads que tabularam (por bitrix_telemarketing_id)
  OR (
    has_role(auth.uid(), 'agent'::app_role) AND (
      bitrix_telemarketing_id IN (
        SELECT atm.bitrix_telemarketing_id 
        FROM agent_telemarketing_mapping atm
        WHERE atm.tabuladormax_user_id = auth.uid()
      )
    )
  )
);