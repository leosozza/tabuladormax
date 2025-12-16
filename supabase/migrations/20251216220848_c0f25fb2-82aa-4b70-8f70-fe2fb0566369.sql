-- Adicionar coluna commercial_project_id na tabela telemarketing_operators
ALTER TABLE telemarketing_operators 
ADD COLUMN IF NOT EXISTS commercial_project_id uuid REFERENCES commercial_projects(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_telemarketing_operators_project 
ON telemarketing_operators(commercial_project_id);

-- Associar a supervisora Vitoria (bitrix_id: 242) ao projeto Pinheiros
UPDATE telemarketing_operators 
SET commercial_project_id = '7bd60527-2ab1-49dd-af3b-de0fb9ef56dd'
WHERE bitrix_id = 242;

-- Associar outros agentes que trabalham no projeto Pinheiros
UPDATE telemarketing_operators 
SET commercial_project_id = '7bd60527-2ab1-49dd-af3b-de0fb9ef56dd'
WHERE bitrix_id IN (
  SELECT DISTINCT bitrix_telemarketing_id 
  FROM leads 
  WHERE commercial_project_id = '7bd60527-2ab1-49dd-af3b-de0fb9ef56dd'
    AND bitrix_telemarketing_id IS NOT NULL
)
AND commercial_project_id IS NULL;