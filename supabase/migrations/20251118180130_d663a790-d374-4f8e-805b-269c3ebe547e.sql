-- Fase 1: Criar tabela de mapeamentos CSV
CREATE TABLE IF NOT EXISTS public.csv_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_name text NOT NULL,
  csv_column text NOT NULL,
  leads_column text NOT NULL,
  transform_function text,
  active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);

-- Enable RLS
ALTER TABLE public.csv_field_mappings ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar todos os mapeamentos
CREATE POLICY "Admins can manage all csv mappings"
ON public.csv_field_mappings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Usuários autenticados podem visualizar mapeamentos ativos
CREATE POLICY "Users can view active csv mappings"
ON public.csv_field_mappings
FOR SELECT
TO authenticated
USING (active = true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_csv_mappings_active ON public.csv_field_mappings(active);
CREATE INDEX IF NOT EXISTS idx_csv_mappings_priority ON public.csv_field_mappings(priority);
CREATE INDEX IF NOT EXISTS idx_csv_mappings_created_by ON public.csv_field_mappings(created_by);
CREATE INDEX IF NOT EXISTS idx_csv_mappings_name ON public.csv_field_mappings(mapping_name);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_csv_field_mappings_updated_at
BEFORE UPDATE ON public.csv_field_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();