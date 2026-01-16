-- Adicionar campo tier na tabela scouters
ALTER TABLE scouters ADD COLUMN IF NOT EXISTS tier text;

-- Comentário para documentação
COMMENT ON COLUMN scouters.tier IS 'Categoria/tier do scouter sincronizado do Bitrix (UF_CRM_32_1759248377)';