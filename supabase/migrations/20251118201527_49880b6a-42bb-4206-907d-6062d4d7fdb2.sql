-- FASE 3: Criar tabela de mapeamentos de resincronização e adicionar campo mapping_id a lead_resync_jobs

-- Criar tabela resync_field_mappings
CREATE TABLE IF NOT EXISTS public.resync_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_name TEXT NOT NULL,
  bitrix_field TEXT NOT NULL,
  leads_column TEXT NOT NULL,
  transform_function TEXT,
  skip_if_null BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices
CREATE INDEX idx_resync_mappings_name ON public.resync_field_mappings(mapping_name);
CREATE INDEX idx_resync_mappings_active ON public.resync_field_mappings(active);
CREATE INDEX idx_resync_mappings_priority ON public.resync_field_mappings(priority);

-- Habilitar RLS
ALTER TABLE public.resync_field_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Admins podem gerenciar tudo
CREATE POLICY "Admins podem gerenciar mapeamentos de resync"
ON public.resync_field_mappings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política: Usuários podem visualizar mapeamentos ativos
CREATE POLICY "Usuários podem visualizar mapeamentos ativos de resync"
ON public.resync_field_mappings
FOR SELECT
TO authenticated
USING (active = true);

-- Adicionar campo mapping_id à tabela lead_resync_jobs
ALTER TABLE public.lead_resync_jobs 
ADD COLUMN IF NOT EXISTS mapping_id UUID REFERENCES public.resync_field_mappings(id);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_resync_jobs_mapping_id ON public.lead_resync_jobs(mapping_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_resync_mappings_updated_at
BEFORE UPDATE ON public.resync_field_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir mapeamentos padrão baseados nos mapeamentos do Bitrix existentes
INSERT INTO public.resync_field_mappings (
  mapping_name,
  bitrix_field,
  leads_column,
  transform_function,
  priority,
  active,
  notes
)
SELECT 
  'Mapeamento Padrão Bitrix',
  bitrix_field,
  tabuladormax_field,
  transform_function,
  priority,
  active,
  'Importado automaticamente dos mapeamentos Bitrix existentes'
FROM public.bitrix_field_mappings
WHERE active = true
ON CONFLICT DO NOTHING;