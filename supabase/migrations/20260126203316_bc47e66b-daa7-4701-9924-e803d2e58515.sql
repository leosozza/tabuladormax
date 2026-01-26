-- Tabela de vinculação entre agentes e treinamentos (ai_training_instructions)
-- Um agente pode ter vários treinamentos e um treinamento pode estar em vários agentes
CREATE TABLE IF NOT EXISTS public.agent_training_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.ai_training_instructions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(agent_id, training_id)
);

-- Enable RLS
ALTER TABLE public.agent_training_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view agent_training_links"
ON public.agent_training_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage agent_training_links"
ON public.agent_training_links FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_agent_training_links_agent_id ON public.agent_training_links(agent_id);
CREATE INDEX idx_agent_training_links_training_id ON public.agent_training_links(training_id);