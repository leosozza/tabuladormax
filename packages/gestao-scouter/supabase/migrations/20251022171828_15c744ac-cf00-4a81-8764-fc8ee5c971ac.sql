-- Adicionar colunas de contexto expandido para análise ultra-precisa
ALTER TABLE error_analyses 
ADD COLUMN IF NOT EXISTS element_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS database_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS source_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS log_context JSONB DEFAULT '{}'::jsonb;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_error_analyses_status ON error_analyses(status);
CREATE INDEX IF NOT EXISTS idx_error_analyses_user_created ON error_analyses(user_id, created_at DESC);

COMMENT ON COLUMN error_analyses.element_context IS 'Contexto do elemento clicado: componente React, props, DOM path';
COMMENT ON COLUMN error_analyses.database_context IS 'Schema do banco, dados de exemplo, RLS policies';
COMMENT ON COLUMN error_analyses.source_context IS 'Código-fonte relevante, dependências, estrutura';
COMMENT ON COLUMN error_analyses.log_context IS 'Logs agregados de edge functions, postgres, auth';