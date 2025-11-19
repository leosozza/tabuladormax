-- Criar tabela para cache de entidades SPA do Bitrix
CREATE TABLE IF NOT EXISTS public.bitrix_spa_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type_id INTEGER NOT NULL,
  bitrix_item_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(entity_type_id, bitrix_item_id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_bitrix_spa_entities_type_id ON public.bitrix_spa_entities(entity_type_id, bitrix_item_id);
CREATE INDEX IF NOT EXISTS idx_bitrix_spa_entities_cached_at ON public.bitrix_spa_entities(cached_at);

-- RLS policies
ALTER TABLE public.bitrix_spa_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view spa entities"
  ON public.bitrix_spa_entities
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Service role can manage spa entities"
  ON public.bitrix_spa_entities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bitrix_spa_entities_updated_at
  BEFORE UPDATE ON public.bitrix_spa_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();