-- 1. Adicionar campo commercial_project_id na tabela leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS commercial_project_id UUID REFERENCES commercial_projects(id);

CREATE INDEX IF NOT EXISTS idx_leads_commercial_project ON leads(commercial_project_id);

-- 2. Criar seed do Projeto Pinheiros
INSERT INTO commercial_projects (id, name, code, description, active)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'::uuid,
  'São Paulo - Pinheiros',
  'PINHEIROS',
  'Projeto comercial SELETIVA SÃO PAULO - PINHEIROS',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 3. Popular commercial_project_id nos leads existentes
UPDATE leads
SET commercial_project_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'::uuid
WHERE raw->>'Projetos Cormeciais' = 'SELETIVA SÃO PAULO - PINHEIROS'
  AND commercial_project_id IS NULL;

-- 4. Atualizar agent_telemarketing_mapping com projeto Pinheiros
UPDATE agent_telemarketing_mapping
SET commercial_project_id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'::uuid
WHERE commercial_project_id IS NULL;

-- 5. Remover coluna department_id de agent_telemarketing_mapping
ALTER TABLE agent_telemarketing_mapping 
DROP COLUMN IF EXISTS department_id;

-- 6. Dropar tabela departments
DROP TABLE IF EXISTS departments CASCADE;

-- 7. Atualizar RLS da tabela leads para considerar hierarquia Projeto + Supervisor
DROP POLICY IF EXISTS "Users can view accessible leads" ON leads;

CREATE POLICY "Users can view accessible leads"
ON leads FOR SELECT
TO authenticated
USING (
  -- Admin e Manager veem tudo
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
  
  -- Supervisor vê:
  -- 1. Todos os leads do seu projeto comercial
  -- 2. Todos os leads dos operadores vinculados a ele
  OR (
    has_role(auth.uid(), 'supervisor')
    AND (
      -- Leads do mesmo projeto comercial do supervisor
      commercial_project_id IN (
        SELECT commercial_project_id 
        FROM agent_telemarketing_mapping 
        WHERE tabuladormax_user_id = auth.uid()
      )
      -- OU leads tabulados por operadores subordinados
      OR responsible IN (
        SELECT bitrix_telemarketing_name::text
        FROM agent_telemarketing_mapping
        WHERE supervisor_id = auth.uid()
      )
    )
  )
  
  -- Agent vê apenas os leads que ele tabulou
  OR (
    has_role(auth.uid(), 'agent')
    AND responsible IN (
      SELECT bitrix_telemarketing_name::text
      FROM agent_telemarketing_mapping
      WHERE tabuladormax_user_id = auth.uid()
    )
  )
);