-- FASE 1: Corrigir mapeamento de responsible na resincronização
-- 1.1. Desativar mapeamento incorreto
UPDATE resync_field_mappings
SET 
  active = false,
  notes = COALESCE(notes || ' | ', '') || 'DESATIVADO: Usa ID numérico ao invés de nome. Substituído por PARENT_ID_1144.'
WHERE mapping_name = 'Mapeamento Padrão Bitrix'
  AND leads_column = 'responsible'
  AND bitrix_field = 'ASSIGNED_BY_ID';

-- 1.2. Criar novo mapeamento correto usando PARENT_ID_1144
INSERT INTO resync_field_mappings (
  mapping_name,
  bitrix_field,
  leads_column,
  transform_function,
  skip_if_null,
  active,
  priority,
  notes
) VALUES (
  'Mapeamento Padrão Bitrix',
  'PARENT_ID_1144',
  'responsible',
  'resolveTelemarketingName',
  true,
  true,
  10,
  'Resolve ID do telemarketing para nome via agent_telemarketing_mapping. Campo crítico para RLS de agents.'
)
ON CONFLICT DO NOTHING;

-- FASE 2: Corrigir leads já resincronizados (dados existentes)
-- 2.1. Criar índice para melhorar performance da correção
CREATE INDEX IF NOT EXISTS idx_leads_responsible_numeric 
ON leads(responsible) 
WHERE responsible ~ '^\d+$';

-- 2.2. Corrigir leads com responsible numérico
UPDATE leads
SET 
  responsible = atm.bitrix_telemarketing_name,
  updated_at = NOW()
FROM agent_telemarketing_mapping atm
WHERE leads.responsible = atm.bitrix_telemarketing_id::text
  AND leads.responsible ~ '^\d+$'
  AND leads.responsible IS NOT NULL;

-- FASE 3: Ajustar unified_field_config (webhook)
-- 3.1. Desativar mapeamento incorreto de responsible
UPDATE unified_field_config
SET 
  sync_active = false,
  notes = COALESCE(notes || ' | ', '') || 'DESATIVADO: Webhook resolve via lógica customizada usando PARENT_ID_1144.'
WHERE supabase_field = 'responsible'
  AND bitrix_field = 'ASSIGNED_BY_ID';

-- Log de resultados
DO $$
DECLARE
  corrigidos INTEGER;
  ainda_numericos INTEGER;
BEGIN
  SELECT COUNT(*) INTO corrigidos
  FROM leads
  WHERE responsible IS NOT NULL
    AND responsible NOT LIKE '%[0-9]%'
    AND updated_at > NOW() - INTERVAL '1 minute';

  SELECT COUNT(*) INTO ainda_numericos
  FROM leads
  WHERE responsible ~ '^\d+$'
    AND responsible IS NOT NULL;

  RAISE NOTICE '✅ Migration concluída:';
  RAISE NOTICE '  - Leads corrigidos: %', corrigidos;
  RAISE NOTICE '  - Leads ainda com ID numérico: %', ainda_numericos;
  RAISE NOTICE '  - Mapeamentos atualizados: resync_field_mappings, unified_field_config';
END $$;