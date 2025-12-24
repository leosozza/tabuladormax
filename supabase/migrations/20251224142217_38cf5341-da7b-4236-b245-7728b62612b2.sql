-- Inserir OpenRouter como provider de IA
INSERT INTO public.ai_providers (
  name,
  display_name,
  base_url,
  is_active,
  is_free,
  requires_api_key,
  supports_tools,
  default_model,
  models
) VALUES (
  'openrouter',
  'OpenRouter',
  'https://openrouter.ai/api/v1',
  true,
  false,
  true,
  true,
  'anthropic/claude-3.5-sonnet',
  '[
    {"id": "anthropic/claude-sonnet-4-20250514", "name": "Claude Sonnet 4"},
    {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet"},
    {"id": "google/gemini-2.0-flash-exp:free", "name": "Gemini 2.0 Flash (Free)"},
    {"id": "google/gemini-2.5-flash-preview-05-20", "name": "Gemini 2.5 Flash"},
    {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B"},
    {"id": "openai/gpt-4o", "name": "GPT-4o"},
    {"id": "deepseek/deepseek-chat", "name": "DeepSeek V3"}
  ]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  requires_api_key = EXCLUDED.requires_api_key,
  supports_tools = EXCLUDED.supports_tools,
  default_model = EXCLUDED.default_model,
  models = EXCLUDED.models,
  updated_at = now();

-- Garantir que o Lovable AI também está na tabela
INSERT INTO public.ai_providers (
  name,
  display_name,
  base_url,
  is_active,
  is_free,
  requires_api_key,
  supports_tools,
  default_model,
  models
) VALUES (
  'lovable',
  'Lovable AI',
  'https://ai.gateway.lovable.dev/v1',
  true,
  true,
  false,
  true,
  'google/gemini-2.5-flash',
  '[
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash"},
    {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro"},
    {"id": "openai/gpt-5", "name": "GPT-5"},
    {"id": "openai/gpt-5-mini", "name": "GPT-5 Mini"}
  ]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  is_free = EXCLUDED.is_free,
  requires_api_key = EXCLUDED.requires_api_key,
  supports_tools = EXCLUDED.supports_tools,
  default_model = EXCLUDED.default_model,
  models = EXCLUDED.models,
  updated_at = now();