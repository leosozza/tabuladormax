-- MELHORIA 1: Adicionar sort_order para reordenação de campos
ALTER TABLE profile_field_mapping 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Atualizar registros existentes com ordem sequencial usando CTE
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) as rn
  FROM profile_field_mapping
)
UPDATE profile_field_mapping 
SET sort_order = numbered.rn
FROM numbered
WHERE profile_field_mapping.id = numbered.id;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_profile_field_mapping_sort_order 
ON profile_field_mapping(sort_order);

-- MELHORIA 4: Criar índices para performance do dashboard individual
CREATE INDEX IF NOT EXISTS idx_leads_responsible 
ON leads(responsible);

CREATE INDEX IF NOT EXISTS idx_actions_log_lead_id 
ON actions_log(lead_id);

CREATE INDEX IF NOT EXISTS idx_actions_log_created_at 
ON actions_log(created_at DESC);