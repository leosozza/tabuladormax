-- ============================================
-- Sistema de Agentes de IA para WhatsApp
-- ============================================

-- Tabela de Agentes de IA
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  commercial_project_id UUID REFERENCES public.commercial_projects(id) ON DELETE SET NULL,
  system_prompt TEXT NOT NULL DEFAULT 'Você é um assistente de atendimento ao cliente via WhatsApp.',
  personality VARCHAR(50) DEFAULT 'profissional',
  ai_provider TEXT DEFAULT 'groq',
  ai_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Treinamentos do Agente
CREATE TABLE public.ai_agents_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'geral',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Vínculo Operador-Agente
CREATE TABLE public.agent_operator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  operator_bitrix_id INTEGER NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(operator_bitrix_id, is_active) -- Um operador só pode ter um agente ativo por vez
);

-- Índices para performance
CREATE INDEX idx_ai_agents_active ON public.ai_agents(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_agents_training_agent ON public.ai_agents_training(agent_id);
CREATE INDEX idx_ai_agents_training_active ON public.ai_agents_training(agent_id, is_active) WHERE is_active = true;
CREATE INDEX idx_agent_operator_assignments_operator ON public.agent_operator_assignments(operator_bitrix_id);
CREATE INDEX idx_agent_operator_assignments_active ON public.agent_operator_assignments(operator_bitrix_id, is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_agents_training_updated_at
  BEFORE UPDATE ON public.ai_agents_training
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_operator_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para ai_agents
CREATE POLICY "Admins can manage ai_agents"
  ON public.ai_agents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read active agents"
  ON public.ai_agents FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS Policies para ai_agents_training
CREATE POLICY "Admins can manage ai_agents_training"
  ON public.ai_agents_training FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read active training"
  ON public.ai_agents_training FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS Policies para agent_operator_assignments
CREATE POLICY "Admins can manage assignments"
  ON public.agent_operator_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read active assignments"
  ON public.agent_operator_assignments FOR SELECT TO authenticated
  USING (is_active = true);

-- Permitir acesso anônimo para edge functions (service role)
CREATE POLICY "Service role can read all agents"
  ON public.ai_agents FOR SELECT TO anon
  USING (true);

CREATE POLICY "Service role can read all training"
  ON public.ai_agents_training FOR SELECT TO anon
  USING (true);

CREATE POLICY "Service role can read all assignments"
  ON public.agent_operator_assignments FOR SELECT TO anon
  USING (true);