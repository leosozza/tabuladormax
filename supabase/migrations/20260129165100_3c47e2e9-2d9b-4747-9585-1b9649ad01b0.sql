-- 1. Adicionar coluna tier na tabela ai_providers
ALTER TABLE ai_providers 
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'standard' 
CHECK (tier IN ('free', 'standard', 'professional'));

COMMENT ON COLUMN ai_providers.tier IS 'Nível do provedor: free (gratuito), standard (padrão), professional (profissional)';

-- 2. Inserir provedores faltantes
INSERT INTO ai_providers (name, display_name, base_url, models, default_model, is_active, is_free, tier)
VALUES 
  (
    'sambanova',
    'SambaNova',
    'https://api.sambanova.ai/v1/chat/completions',
    '[{"id": "Meta-Llama-3.1-70B-Instruct", "name": "Llama 3.1 70B"}, {"id": "Meta-Llama-3.1-405B-Instruct", "name": "Llama 3.1 405B"}]'::jsonb,
    'Meta-Llama-3.1-70B-Instruct',
    true,
    true,
    'free'
  ),
  (
    'cerebras',
    'Cerebras',
    'https://api.cerebras.ai/v1/chat/completions',
    '[{"id": "llama-3.3-70b", "name": "Llama 3.3 70B"}]'::jsonb,
    'llama-3.3-70b',
    true,
    true,
    'free'
  ),
  (
    'deepseek',
    'DeepSeek',
    'https://api.deepseek.com/v1/chat/completions',
    '[{"id": "deepseek-chat", "name": "DeepSeek Chat"}, {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner"}]'::jsonb,
    'deepseek-chat',
    true,
    true,
    'free'
  ),
  (
    'google-studio',
    'Google AI Studio',
    'https://generativelanguage.googleapis.com/v1beta',
    '[{"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash"}, {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro"}]'::jsonb,
    'gemini-2.5-flash',
    true,
    true,
    'free'
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_url = EXCLUDED.base_url,
  models = EXCLUDED.models,
  default_model = EXCLUDED.default_model,
  is_active = EXCLUDED.is_active,
  is_free = EXCLUDED.is_free,
  tier = EXCLUDED.tier;

-- 3. Atualizar tier dos provedores existentes
UPDATE ai_providers SET tier = 'free' WHERE name = 'groq';
UPDATE ai_providers SET tier = 'standard' WHERE name IN ('lovable', 'together', 'openrouter');
UPDATE ai_providers SET tier = 'professional' WHERE name IN ('openai', 'anthropic', 'xai');