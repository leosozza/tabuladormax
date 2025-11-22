-- ============================================
-- Sincronização de Status dos Scouters do Bitrix
-- ============================================

-- 1. Adicionar campo stage_id à tabela bitrix_spa_entities
ALTER TABLE public.bitrix_spa_entities 
ADD COLUMN IF NOT EXISTS stage_id TEXT;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_bitrix_spa_entities_stage_id 
ON public.bitrix_spa_entities(stage_id);

-- 2. Criar tabela de mapeamento Stage → Status
CREATE TABLE IF NOT EXISTS public.bitrix_stage_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type_id INTEGER NOT NULL,
  stage_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  app_status TEXT NOT NULL CHECK (app_status IN ('ativo', 'inativo', 'standby', 'blacklist')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(entity_type_id, stage_id)
);

-- Comentários
COMMENT ON TABLE public.bitrix_stage_mapping IS 'Mapeamento entre stages do Bitrix e status da aplicação';
COMMENT ON COLUMN public.bitrix_stage_mapping.stage_id IS 'ID da stage no Bitrix (ex: DT1096_20:ATIVO)';
COMMENT ON COLUMN public.bitrix_stage_mapping.app_status IS 'Status correspondente na aplicação';

-- Índices
CREATE INDEX IF NOT EXISTS idx_bitrix_stage_mapping_entity_stage 
ON public.bitrix_stage_mapping(entity_type_id, stage_id);

-- 3. Habilitar Row Level Security
ALTER TABLE public.bitrix_stage_mapping ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso
CREATE POLICY "Admins can manage stage mappings"
  ON public.bitrix_stage_mapping FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "All users can view stage mappings"
  ON public.bitrix_stage_mapping FOR SELECT
  USING (true);

-- 5. Trigger para updated_at
CREATE TRIGGER update_bitrix_stage_mapping_updated_at
  BEFORE UPDATE ON public.bitrix_stage_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DADOS INICIAIS DE MAPEAMENTO
-- ============================================
-- IMPORTANTE: Ajustar os stage_ids conforme IDs reais do Bitrix
-- Para descobrir os IDs corretos, use:
-- GET https://maxsystem.bitrix24.com.br/rest/{token}/crm.status.list?filter[ENTITY_ID]=DYNAMIC_1096_STAGE_*

-- Exemplos (AJUSTAR CONFORME BITRIX REAL):
INSERT INTO public.bitrix_stage_mapping (entity_type_id, stage_id, stage_name, app_status)
VALUES 
  (1096, 'DT1096_20:NEW', 'Scouter Ativo', 'ativo'),
  (1096, 'DT1096_20:IN_PROCESS', 'Scouter Inativo', 'inativo'),
  (1096, 'DT1096_20:PROCESSED', 'Scouter Standby', 'standby'),
  (1096, 'DT1096_20:FAIL', 'Black-list', 'blacklist')
ON CONFLICT (entity_type_id, stage_id) DO NOTHING;

-- ============================================
-- INSTRUÇÕES PARA CONFIGURAÇÃO
-- ============================================
-- 1. Descobrir IDs das stages no Bitrix via API ou interface
-- 2. Atualizar mapeamentos na tabela bitrix_stage_mapping
-- 3. Executar sync-bitrix-spa-entities para buscar stage_id
-- 4. Executar sync-scouters-status para sincronizar status
-- 5. Verificar resultado no Kanban de Scouters