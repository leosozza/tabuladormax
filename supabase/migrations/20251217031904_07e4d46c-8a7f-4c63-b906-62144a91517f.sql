
-- Tabela de provedores de IA
CREATE TABLE public.ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  models JSONB NOT NULL DEFAULT '[]',
  supports_tools BOOLEAN DEFAULT true,
  is_free BOOLEAN DEFAULT false,
  requires_api_key BOOLEAN DEFAULT true,
  default_model TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir provedores padrão
INSERT INTO public.ai_providers (name, display_name, base_url, models, supports_tools, is_free, requires_api_key, default_model) VALUES
('lovable', 'Lovable AI', 'https://ai.gateway.lovable.dev/v1', '[
  {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "description": "Rápido e balanceado"},
  {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Mais preciso, contexto grande"},
  {"id": "google/gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "description": "Mais rápido e econômico"},
  {"id": "openai/gpt-5", "name": "GPT-5", "description": "Poderoso, raciocínio avançado"},
  {"id": "openai/gpt-5-mini", "name": "GPT-5 Mini", "description": "Balanceado custo/performance"},
  {"id": "openai/gpt-5-nano", "name": "GPT-5 Nano", "description": "Rápido e econômico"}
]'::jsonb, true, false, false, 'google/gemini-2.5-flash'),

('groq', 'Groq (Gratuito)', 'https://api.groq.com/openai/v1', '[
  {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B", "description": "Muito capaz, gratuito"},
  {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B", "description": "Ultra rápido"},
  {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "description": "Bom em código"},
  {"id": "gemma2-9b-it", "name": "Gemma 2 9B", "description": "Compacto e eficiente"}
]'::jsonb, true, true, true, 'llama-3.3-70b-versatile'),

('openai', 'OpenAI', 'https://api.openai.com/v1', '[
  {"id": "gpt-4o", "name": "GPT-4o", "description": "Multimodal avançado"},
  {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "Rápido e econômico"},
  {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "description": "Versão turbo"}
]'::jsonb, true, false, true, 'gpt-4o-mini'),

('xai', 'xAI Grok', 'https://api.x.ai/v1', '[
  {"id": "grok-beta", "name": "Grok Beta", "description": "Modelo principal"},
  {"id": "grok-2-1212", "name": "Grok 2", "description": "Versão mais recente"}
]'::jsonb, true, false, true, 'grok-beta'),

('together', 'Together AI', 'https://api.together.xyz/v1', '[
  {"id": "meta-llama/Llama-3.3-70B-Instruct-Turbo", "name": "Llama 3.3 70B Turbo", "description": "Alta performance"},
  {"id": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "name": "Llama 3.1 8B Turbo", "description": "Rápido"},
  {"id": "mistralai/Mixtral-8x7B-Instruct-v0.1", "name": "Mixtral 8x7B", "description": "Bom equilíbrio"},
  {"id": "Qwen/Qwen2.5-72B-Instruct-Turbo", "name": "Qwen 2.5 72B", "description": "Muito capaz"}
]'::jsonb, true, false, true, 'meta-llama/Llama-3.3-70B-Instruct-Turbo'),

('anthropic', 'Anthropic Claude', 'https://api.anthropic.com/v1', '[
  {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "description": "Melhor balanceado"},
  {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "description": "Rápido e econômico"}
]'::jsonb, true, false, true, 'claude-3-5-sonnet-20241022');

-- Tabela de ferramentas do agente
CREATE TABLE public.bot_agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_project_id UUID REFERENCES public.commercial_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('webhook', 'bitrix_update', 'bitrix_get', 'supabase_query', 'n8n_workflow', 'send_template', 'transfer_human')),
  config JSONB NOT NULL DEFAULT '{}',
  parameters_schema JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(commercial_project_id, name)
);

-- Adicionar campos de AI provider na config do bot
ALTER TABLE public.whatsapp_bot_config 
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'lovable',
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'google/gemini-2.5-flash',
ADD COLUMN IF NOT EXISTS api_key_secret_name TEXT,
ADD COLUMN IF NOT EXISTS tools_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS available_tools UUID[] DEFAULT '{}';

-- Tabela de logs de execução de ferramentas
CREATE TABLE public.bot_tool_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.whatsapp_bot_conversations(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES public.bot_agent_tools(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  input_params JSONB,
  output_result JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para ai_providers
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active providers"
ON public.ai_providers FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage providers"
ON public.ai_providers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS para bot_agent_tools
ALTER TABLE public.bot_agent_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tools for their projects"
ON public.bot_agent_tools FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage tools"
ON public.bot_agent_tools FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS para bot_tool_execution_logs
ALTER TABLE public.bot_tool_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view tool logs"
ON public.bot_tool_execution_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "System can insert tool logs"
ON public.bot_tool_execution_logs FOR INSERT
WITH CHECK (true);

-- Índices
CREATE INDEX idx_bot_agent_tools_project ON public.bot_agent_tools(commercial_project_id);
CREATE INDEX idx_bot_tool_logs_conversation ON public.bot_tool_execution_logs(conversation_id);
CREATE INDEX idx_bot_tool_logs_created ON public.bot_tool_execution_logs(created_at DESC);
