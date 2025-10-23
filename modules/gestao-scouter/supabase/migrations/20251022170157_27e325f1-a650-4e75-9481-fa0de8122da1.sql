-- Tabela de análises de erros
CREATE TABLE IF NOT EXISTS error_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do erro
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_context JSONB DEFAULT '{}',
  
  -- Console logs e network requests relacionados
  console_logs JSONB DEFAULT '[]',
  network_requests JSONB DEFAULT '[]',
  
  -- Rota onde ocorreu
  route TEXT,
  
  -- Análise da IA
  ai_provider TEXT NOT NULL DEFAULT 'lovable',
  ai_model TEXT,
  analysis_result JSONB,
  suggested_fixes JSONB DEFAULT '[]',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, analyzing, completed, applied, failed, rolled_back
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'
);

-- Tabela de correções sugeridas
CREATE TABLE IF NOT EXISTS fix_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES error_analyses(id) ON DELETE CASCADE,
  
  -- Dados da correção
  fix_title TEXT NOT NULL,
  fix_description TEXT NOT NULL,
  fix_type TEXT NOT NULL,
  -- code_change, config_change, dependency_update, etc
  
  -- Código/alterações
  file_path TEXT,
  original_code TEXT,
  suggested_code TEXT,
  diff TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, approved, rejected, applied, rolled_back
  
  -- Aprovação
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Aplicação
  applied_at TIMESTAMPTZ,
  
  -- Snapshot para rollback
  snapshot_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de snapshots do código
CREATE TABLE IF NOT EXISTS code_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES error_analyses(id) ON DELETE SET NULL,
  
  -- Dados do snapshot
  snapshot_data JSONB NOT NULL,
  -- Armazena estrutura de arquivos e conteúdo
  
  -- Metadados
  description TEXT,
  file_count INTEGER,
  total_size_bytes BIGINT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de configuração de providers de IA
CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider
  provider TEXT NOT NULL,
  -- lovable, openai, gemini, grok, anthropic
  
  -- Configuração
  api_key_encrypted TEXT,
  model TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- Índices para performance
CREATE INDEX idx_error_analyses_user ON error_analyses(user_id);
CREATE INDEX idx_error_analyses_status ON error_analyses(status);
CREATE INDEX idx_error_analyses_created ON error_analyses(created_at DESC);

CREATE INDEX idx_fix_suggestions_analysis ON fix_suggestions(analysis_id);
CREATE INDEX idx_fix_suggestions_status ON fix_suggestions(status);

CREATE INDEX idx_code_snapshots_user ON code_snapshots(user_id);
CREATE INDEX idx_code_snapshots_analysis ON code_snapshots(analysis_id);

CREATE INDEX idx_ai_provider_configs_user ON ai_provider_configs(user_id);
CREATE INDEX idx_ai_provider_configs_active ON ai_provider_configs(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE error_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fix_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;

-- Policies para error_analyses
CREATE POLICY "Users can view their own error analyses"
  ON error_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own error analyses"
  ON error_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own error analyses"
  ON error_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can update error analyses"
  ON error_analyses FOR UPDATE
  USING (true);

-- Policies para fix_suggestions
CREATE POLICY "Users can view fix suggestions for their analyses"
  ON fix_suggestions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM error_analyses 
    WHERE error_analyses.id = fix_suggestions.analysis_id 
    AND error_analyses.user_id = auth.uid()
  ));

CREATE POLICY "Edge functions can insert fix suggestions"
  ON fix_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update fix suggestions for their analyses"
  ON fix_suggestions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM error_analyses 
    WHERE error_analyses.id = fix_suggestions.analysis_id 
    AND error_analyses.user_id = auth.uid()
  ));

-- Policies para code_snapshots
CREATE POLICY "Users can view their own snapshots"
  ON code_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots"
  ON code_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can create snapshots"
  ON code_snapshots FOR INSERT
  WITH CHECK (true);

-- Policies para ai_provider_configs
CREATE POLICY "Users can manage their own AI provider configs"
  ON ai_provider_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ai_provider_configs
CREATE TRIGGER update_ai_provider_configs_updated_at
  BEFORE UPDATE ON ai_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();