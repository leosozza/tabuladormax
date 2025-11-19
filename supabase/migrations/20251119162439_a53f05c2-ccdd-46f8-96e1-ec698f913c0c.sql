-- Limpeza de mapeamentos duplicados Bitrix
-- Data: 2025-11-19
-- Objetivo: Manter apenas 1 mapeamento ativo por campo Supabase

-- Desativar mapeamentos duplicados de baixa prioridade
UPDATE bitrix_field_mappings
SET 
  active = false,
  notes = COALESCE(notes, '') || ' [DESATIVADO: Duplicado removido em limpeza 2025-11-19]',
  updated_at = now()
WHERE id IN (
  -- telefone_casa duplicados (manter UF_CRM_1762868715)
  'a0155338-00ac-4e03-a1eb-c02aca7af876', -- PHONE
  '654fcf4f-5fa8-4c58-bd49-2c24d81e7223', -- UF_CRM_1729775837
  
  -- etapa_fluxo duplicado (manter UF_CRM_1742391534)
  '94cf37cd-f08b-439a-aa4f-eceea13ebc4d', -- UF_CRM_1741961401
  
  -- etapa_funil duplicado (manter UF_CRM_1742391480)
  'ec76cb88-d20f-4644-9d85-0c9794e7e3a1', -- UF_CRM_1744324211
  
  -- ficha_confirmada duplicado (manter UF_CRM_1729776113)
  '30764745-4ebe-4bf8-bd2b-6b6a6896e3fb', -- UF_CRM_1737378043893
  
  -- fonte duplicado (manter SOURCE_ID)
  'ee7c2b14-e2ad-4181-ad8c-e2e6b096e4eb', -- UF_CRM_1729776032
  
  -- gerenciamento_funil duplicado (manter UF_CRM_1742391351)
  '7863af3c-ccca-4064-9f86-051dc9c42cbb', -- UF_CRM_1744320647
  
  -- local_abordagem duplicado (manter ADDRESS_CITY)
  '890cc463-3e1d-4e66-90ff-1307b1275aac', -- UF_CRM_1729775954
  
  -- name duplicado (manter NAME)
  '356efb4e-cda4-467b-9e60-059c6a5abd32', -- TITLE
  
  -- presenca_confirmada duplicado (manter UF_CRM_1729776132)
  '9d595c0d-19ae-4ac1-b409-a2907eb2d539', -- UF_CRM_1729776110
  
  -- responsible duplicado (manter ASSIGNED_BY_ID)
  '8acd79e9-1108-4aa4-ac35-df70b09faf73' -- UF_CRM_1622827519
);

-- Criar índice para melhorar performance de queries de mapeamento
CREATE INDEX IF NOT EXISTS idx_bitrix_field_mappings_active_priority 
ON bitrix_field_mappings(active, priority DESC) 
WHERE active = true;