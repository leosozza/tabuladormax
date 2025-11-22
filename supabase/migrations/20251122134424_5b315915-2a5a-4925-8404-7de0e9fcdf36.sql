-- Criar tabela para instruções de treinamento de IA
CREATE TABLE IF NOT EXISTS ai_training_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'text', 'pdf', 'document'
  content TEXT, -- Instrução em texto ou conteúdo parseado do PDF
  file_path TEXT, -- Caminho no Storage se for arquivo
  priority INTEGER DEFAULT 0, -- Ordem de importância (0-10)
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(100), -- 'procedures', 'product_knowledge', 'responses', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- Índice para otimizar queries
CREATE INDEX idx_ai_training_active ON ai_training_instructions(is_active, priority DESC);
CREATE INDEX idx_ai_training_category ON ai_training_instructions(category) WHERE is_active = true;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_training_updated_at
  BEFORE UPDATE ON ai_training_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE ai_training_instructions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins
CREATE POLICY "Admins can manage AI training"
  ON ai_training_instructions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar bucket para documentos de treinamento
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-training-docs', 'ai-training-docs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para o bucket
CREATE POLICY "Admins can upload training docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ai-training-docs' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can view training docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ai-training-docs' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete training docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ai-training-docs' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );