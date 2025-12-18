-- 1. Remover duplicatas mantendo apenas o mais recente por bitrix_deal_id
WITH duplicates AS (
  SELECT id, bitrix_deal_id,
    ROW_NUMBER() OVER (PARTITION BY bitrix_deal_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) as rn
  FROM negotiations
  WHERE bitrix_deal_id IS NOT NULL
)
DELETE FROM negotiations 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 2. Criar função de mapeamento de stage_id → status
CREATE OR REPLACE FUNCTION public.map_bitrix_stage_to_status(stage_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN CASE stage_id
    -- Stages da categoria 1 (Agenciamento)
    WHEN 'C1:NEW' THEN 'inicial'
    WHEN 'C1:UC_O2KDK6' THEN 'ficha_preenchida'
    WHEN 'C1:UC_MKIQ0S' THEN 'atendimento_produtor'
    WHEN 'C1:PREPARATION' THEN 'ficha_preenchida'
    WHEN 'C1:PREPAYMENT_INVOICE' THEN 'atendimento_produtor'
    WHEN 'C1:EXECUTING' THEN 'atendimento_produtor'
    WHEN 'C1:FINAL_INVOICE' THEN 'atendimento_produtor'
    WHEN 'C1:WON' THEN 'realizado'
    WHEN 'C1:LOSE' THEN 'nao_realizado'
    -- Stages genéricos (sem prefixo de categoria)
    WHEN 'NEW' THEN 'inicial'
    WHEN 'PREPARATION' THEN 'ficha_preenchida'
    WHEN 'PREPAYMENT_INVOICE' THEN 'atendimento_produtor'
    WHEN 'EXECUTING' THEN 'atendimento_produtor'
    WHEN 'FINAL_INVOICE' THEN 'atendimento_produtor'
    WHEN 'WON' THEN 'realizado'
    WHEN 'LOSE' THEN 'nao_realizado'
    WHEN 'APOLOGY' THEN 'nao_realizado'
    ELSE 'inicial'
  END;
END;
$$;

-- 3. Atualizar status das negotiations baseado no stage_id do deal vinculado
UPDATE negotiations n
SET 
  status = public.map_bitrix_stage_to_status(d.stage_id),
  updated_at = NOW()
FROM deals d
WHERE n.deal_id = d.id
  AND d.stage_id IS NOT NULL
  AND n.status IS DISTINCT FROM public.map_bitrix_stage_to_status(d.stage_id);