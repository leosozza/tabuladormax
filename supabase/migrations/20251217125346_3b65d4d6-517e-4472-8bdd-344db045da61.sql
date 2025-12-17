-- Corrigir tabuladormax_user_id da Vitória (bitrix_telemarketing_id = 242)
UPDATE agent_telemarketing_mapping 
SET tabuladormax_user_id = '2148e6ca-465e-4e75-bafb-d1b017f20eda'
WHERE bitrix_telemarketing_id = 242;