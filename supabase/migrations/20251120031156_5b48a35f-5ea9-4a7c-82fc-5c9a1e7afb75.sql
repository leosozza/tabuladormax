-- =====================================================
-- FASE 2: Alinhar unified_field_config com mapeamento oficial
-- =====================================================

-- Desativar mapeamentos duplicados/incorretos identificados na auditoria
UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'etapa_fluxo' AND bitrix_field = 'UF_CRM_1741961401';

UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'etapa_funil' AND bitrix_field = 'UF_CRM_1744324211';

UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'ficha_confirmada' AND bitrix_field = 'UF_CRM_1737378043893';

UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'fonte' AND bitrix_field = 'UF_CRM_1729776032';

UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'gerenciamento_funil' AND bitrix_field = 'UF_CRM_1744320647';

UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'local_abordagem' AND bitrix_field = 'UF_CRM_1729775954';

UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'presenca_confirmada' AND bitrix_field = 'UF_CRM_1729776110';

UPDATE unified_field_config SET sync_active = false, notes = 'Desativado - campo Bitrix incorreto (auditoria 2025-01-20)'
WHERE supabase_field = 'telefone_casa' AND bitrix_field IN ('PHONE', 'UF_CRM_1729775837');

-- Ativar mapeamentos oficiais corretos com prioridades adequadas
UPDATE unified_field_config 
SET sync_active = true, sync_priority = 30, notes = 'Campo oficial - etapa do fluxo (auditoria 2025-01-20)'
WHERE supabase_field = 'etapa_fluxo' AND bitrix_field = 'UF_CRM_1742391534';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 30, notes = 'Campo oficial - etapa do funil (auditoria 2025-01-20)'
WHERE supabase_field = 'etapa_funil' AND bitrix_field = 'UF_CRM_1742391480';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 50, notes = 'Campo oficial - ficha confirmada (auditoria 2025-01-20)'
WHERE supabase_field = 'ficha_confirmada' AND bitrix_field = 'UF_CRM_1729776113';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 60, notes = 'Campo oficial - fonte/origem (auditoria 2025-01-20)'
WHERE supabase_field = 'fonte' AND bitrix_field = 'SOURCE_ID';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 30, notes = 'Campo oficial - gerenciamento do funil (auditoria 2025-01-20)'
WHERE supabase_field = 'gerenciamento_funil' AND bitrix_field = 'UF_CRM_1742391351';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 40, notes = 'Campo oficial - cidade/local (auditoria 2025-01-20)'
WHERE supabase_field = 'local_abordagem' AND bitrix_field = 'ADDRESS_CITY';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 50, notes = 'Campo oficial - presença confirmada (auditoria 2025-01-20)'
WHERE supabase_field = 'presenca_confirmada' AND bitrix_field = 'UF_CRM_1729776132';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 80, notes = 'Campo oficial - telefone residencial (auditoria 2025-01-20)'
WHERE supabase_field = 'telefone_casa' AND bitrix_field = 'UF_CRM_1762868715';

-- Garantir que campos SPA estejam com prioridade alta para não serem sobrescritos
UPDATE unified_field_config 
SET sync_active = true, sync_priority = 90, notes = 'Campo SPA - scouter (via PARENT_ID_1096)'
WHERE supabase_field IN ('scouter', 'gestao_scouter') AND bitrix_field = 'PARENT_ID_1096';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 90, notes = 'Campo SPA - telemarketing (via PARENT_ID_1144)'
WHERE supabase_field IN ('telemarketing', 'op_telemarketing') AND bitrix_field = 'PARENT_ID_1144';

UPDATE unified_field_config 
SET sync_active = true, sync_priority = 90, notes = 'Campo SPA - projeto comercial (via PARENT_ID_1120)'
WHERE supabase_field = 'projeto_comercial' AND bitrix_field = 'PARENT_ID_1120';

-- =====================================================
-- FASE 3: Alinhar resync_field_mappings 
-- =====================================================

-- Desativar mapeamento padrão antigo
UPDATE resync_field_mappings 
SET active = false, notes = 'Desativado - será recriado com campos corretos (auditoria 2025-01-20)'
WHERE mapping_name = 'Mapeamento Padrão Bitrix' AND active = true;

-- Criar novo mapeamento padrão limpo baseado em bitrix_field_mappings oficial
INSERT INTO resync_field_mappings (
  mapping_name, 
  bitrix_field, 
  leads_column, 
  transform_function, 
  skip_if_null, 
  priority, 
  active, 
  notes
) VALUES
  -- Campos principais
  ('Mapeamento Padrão Bitrix', 'NAME', 'name', NULL, true, 0, true, 'Nome do lead'),
  ('Mapeamento Padrão Bitrix', 'ASSIGNED_BY_ID', 'responsible', 'toString', true, 1, true, 'ID do responsável'),
  ('Mapeamento Padrão Bitrix', 'STATUS_ID', 'etapa', NULL, true, 10, true, 'Status/etapa do lead'),
  
  -- Campos com transformação
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1741215746', 'commercial_project_id', 'bitrixProjectCodeToUUID', true, 20, true, 'Projeto comercial (código → UUID)'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_LEAD_1732627097745', 'nome_modelo', NULL, true, 25, true, 'Nome do modelo'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1742226427', 'scouter', NULL, true, 27, true, 'Scouter responsável'),
  
  -- Etapas e funis (campos corretos)
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1742391534', 'etapa_fluxo', NULL, true, 30, true, 'Etapa do fluxo'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1742391480', 'etapa_funil', NULL, true, 30, true, 'Etapa do funil'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1742391351', 'gerenciamento_funil', NULL, true, 30, true, 'Gerenciamento do funil'),
  
  -- Local e contato
  ('Mapeamento Padrão Bitrix', 'ADDRESS_CITY', 'local_abordagem', NULL, true, 40, true, 'Cidade do endereço'),
  ('Mapeamento Padrão Bitrix', 'ADDRESS', 'address', NULL, true, 45, true, 'Endereço completo'),
  
  -- Confirmações
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1729776113', 'ficha_confirmada', 'toBoolean', true, 50, true, 'Ficha confirmada'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1729776132', 'presenca_confirmada', 'toBoolean', true, 50, true, 'Presença confirmada'),
  
  -- Fonte
  ('Mapeamento Padrão Bitrix', 'SOURCE_ID', 'fonte', NULL, true, 60, true, 'Origem/fonte do lead'),
  
  -- Telefones
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1762868715', 'telefone_casa', NULL, true, 80, true, 'Telefone residencial'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1729775915', 'telefone_trabalho', NULL, true, 80, true, 'Telefone trabalho'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1729775894', 'celular', NULL, true, 80, true, 'Celular'),
  
  -- Datas (com transformação)
  ('Mapeamento Padrão Bitrix', 'DATE_CREATE', 'criado', 'toDate', true, 90, true, 'Data de criação'),
  ('Mapeamento Padrão Bitrix', 'DATE_MODIFY', 'date_modify', 'toDate', true, 90, true, 'Data de modificação'),
  
  -- Campos adicionais
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1729776004', 'valor_ficha', 'toNumber', true, 100, true, 'Valor da ficha'),
  ('Mapeamento Padrão Bitrix', 'UF_CRM_1729776024', 'idade', 'toNumber', true, 100, true, 'Idade')
ON CONFLICT DO NOTHING;