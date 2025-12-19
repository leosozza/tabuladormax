-- 1. Deletar duplicatas mantendo apenas a mais recente por deal_id
DELETE FROM negotiations
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY deal_id 
      ORDER BY created_at DESC
    ) as rn
    FROM negotiations
    WHERE deal_id IS NOT NULL
  ) t
  WHERE rn > 1
);

-- 2. Adicionar constraint UNIQUE para deal_id (evita duplicatas por deal)
ALTER TABLE negotiations ADD CONSTRAINT negotiations_deal_id_unique 
  UNIQUE (deal_id);

-- 3. Adicionar constraint UNIQUE para bitrix_deal_id (evita duplicatas por bitrix_deal_id)
ALTER TABLE negotiations ADD CONSTRAINT negotiations_bitrix_deal_id_unique 
  UNIQUE (bitrix_deal_id);