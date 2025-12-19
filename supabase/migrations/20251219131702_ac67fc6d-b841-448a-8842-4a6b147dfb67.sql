-- 1. Remover o check constraint
ALTER TABLE negotiations DROP CONSTRAINT IF EXISTS negotiations_status_check;

-- 2. PRIMEIRO: Mapear status antigos para novos (sem olhar deal)
UPDATE negotiations 
SET status = CASE status
  WHEN 'inicial' THEN 'recepcao_cadastro'
  WHEN 'realizado' THEN 'negocios_fechados'
  WHEN 'nao_realizado' THEN 'contrato_nao_fechado'
  ELSE status
END,
updated_at = NOW()
WHERE status IN ('inicial', 'realizado', 'nao_realizado');

-- 3. DEPOIS: Corrigir baseado no stage_id do deal para ter dados precisos
UPDATE negotiations n
SET status = CASE d.stage_id
  WHEN 'C1:NEW' THEN 'recepcao_cadastro'
  WHEN 'C1:UC_O2KDK6' THEN 'ficha_preenchida'
  WHEN 'C1:EXECUTING' THEN 'atendimento_produtor'
  WHEN 'C1:WON' THEN 'negocios_fechados'
  WHEN 'C1:LOSE' THEN 'contrato_nao_fechado'
  WHEN 'C1:UC_MKIQ0S' THEN 'analisar'
  ELSE n.status
END,
updated_at = NOW()
FROM deals d
WHERE n.deal_id = d.id
  AND d.stage_id IN ('C1:NEW', 'C1:UC_O2KDK6', 'C1:EXECUTING', 'C1:WON', 'C1:LOSE', 'C1:UC_MKIQ0S');

-- 4. Adicionar novo check constraint
ALTER TABLE negotiations ADD CONSTRAINT negotiations_status_check 
CHECK (status IN (
  'recepcao_cadastro',
  'ficha_preenchida',
  'atendimento_produtor',
  'negocios_fechados',
  'contrato_nao_fechado',
  'analisar'
));