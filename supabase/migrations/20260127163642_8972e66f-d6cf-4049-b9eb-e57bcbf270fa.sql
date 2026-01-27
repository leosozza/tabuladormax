-- =====================================================
-- Multi-Pipeline Support for Agenciamento
-- =====================================================

-- 1. Create pipeline_configs table to store dynamic stage mappings
CREATE TABLE public.pipeline_configs (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  stage_mapping jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read
CREATE POLICY "Pipeline configs are readable by authenticated users"
ON public.pipeline_configs FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can modify (simplified for now)
CREATE POLICY "Authenticated users can modify pipeline configs"
ON public.pipeline_configs FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Add pipeline_id column to negotiations
ALTER TABLE public.negotiations 
ADD COLUMN IF NOT EXISTS pipeline_id text;

-- Create index for pipeline filtering
CREATE INDEX IF NOT EXISTS idx_negotiations_pipeline_id 
ON public.negotiations(pipeline_id);

-- 3. Enable realtime for deals table (negotiations already has it)
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;

-- 4. Insert initial pipeline configurations
-- Pipeline Pinheiros (category_id = 1)
INSERT INTO public.pipeline_configs (id, name, description, stage_mapping) VALUES
('1', 'Pinheiros', 'Pipeline principal de agenciamento - Pinheiros', '{
  "stages": {
    "C1:NEW": "recepcao_cadastro",
    "C1:UC_O2KDK6": "ficha_preenchida",
    "C1:EXECUTING": "atendimento_produtor",
    "C1:WON": "negocios_fechados",
    "C1:LOSE": "contrato_nao_fechado",
    "C1:UC_MKIQ0S": "analisar"
  },
  "reverse": {
    "recepcao_cadastro": "C1:NEW",
    "ficha_preenchida": "C1:UC_O2KDK6",
    "atendimento_produtor": "C1:EXECUTING",
    "negocios_fechados": "C1:WON",
    "contrato_nao_fechado": "C1:LOSE",
    "analisar": "C1:UC_MKIQ0S"
  }
}');

-- Pipeline Carrão (category_id = 30)
INSERT INTO public.pipeline_configs (id, name, description, stage_mapping) VALUES
('30', 'Carrão', 'Pipeline de agenciamento - Carrão', '{
  "stages": {
    "C30:NEW": "recepcao_cadastro",
    "C30:UC_O2KDK6": "ficha_preenchida",
    "C30:EXECUTING": "atendimento_produtor",
    "C30:WON": "negocios_fechados",
    "C30:LOSE": "contrato_nao_fechado",
    "C30:UC_MKIQ0S": "analisar"
  },
  "reverse": {
    "recepcao_cadastro": "C30:NEW",
    "ficha_preenchida": "C30:UC_O2KDK6",
    "atendimento_produtor": "C30:EXECUTING",
    "negocios_fechados": "C30:WON",
    "contrato_nao_fechado": "C30:LOSE",
    "analisar": "C30:UC_MKIQ0S"
  }
}');

-- Pipeline 8 (if exists)
INSERT INTO public.pipeline_configs (id, name, description, stage_mapping) VALUES
('8', 'Pipeline 8', 'Outra pipeline', '{
  "stages": {
    "C8:NEW": "recepcao_cadastro",
    "C8:PREPARATION": "ficha_preenchida",
    "C8:EXECUTING": "atendimento_produtor",
    "C8:WON": "negocios_fechados",
    "C8:LOSE": "contrato_nao_fechado",
    "C8:UC_W27VUC": "analisar"
  },
  "reverse": {
    "recepcao_cadastro": "C8:NEW",
    "ficha_preenchida": "C8:PREPARATION",
    "atendimento_produtor": "C8:EXECUTING",
    "negocios_fechados": "C8:WON",
    "contrato_nao_fechado": "C8:LOSE",
    "analisar": "C8:UC_W27VUC"
  }
}');

-- 5. Migrate existing negotiations to have pipeline_id from deals
UPDATE public.negotiations n
SET pipeline_id = CAST(d.category_id AS text)
FROM public.deals d
WHERE n.deal_id = d.id
AND n.pipeline_id IS NULL;