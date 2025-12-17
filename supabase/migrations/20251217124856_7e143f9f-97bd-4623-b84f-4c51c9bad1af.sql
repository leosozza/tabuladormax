-- Atualizar role da Vitória (bitrix_id 100482) para supervisor
UPDATE user_roles 
SET role = 'supervisor'
WHERE user_id = '2148e6ca-465e-4e75-bafb-d1b017f20eda';

-- Atualizar roles de todos os supervisores existentes baseado no mapping
-- (cargo 10620 = supervisor no Bitrix)
UPDATE user_roles ur
SET role = 'supervisor'
FROM agent_telemarketing_mapping atm
WHERE ur.user_id = atm.tabuladormax_user_id
  AND atm.bitrix_telemarketing_id IN (
    SELECT bitrix_id 
    FROM telemarketing_operators 
    WHERE cargo = '10620'
  );