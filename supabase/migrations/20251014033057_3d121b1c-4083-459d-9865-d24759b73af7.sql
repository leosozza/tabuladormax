-- ============================================
-- Tabela de Mapeamento: Agente ↔ Telemarketing Bitrix
-- ============================================

-- Criar tabela de mapeamento entre agentes e telemarketing do Bitrix24
CREATE TABLE IF NOT EXISTS public.agent_telemarketing_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatwoot_agent_email TEXT,
  tabuladormax_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bitrix_telemarketing_id INTEGER NOT NULL,
  bitrix_telemarketing_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint: pelo menos um identificador deve estar preenchido
  CONSTRAINT at_least_one_identifier CHECK (
    chatwoot_agent_email IS NOT NULL OR tabuladormax_user_id IS NOT NULL
  ),
  
  -- Unique constraint para evitar duplicatas
  CONSTRAINT unique_agent_mapping UNIQUE (chatwoot_agent_email, tabuladormax_user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_telemarketing_email 
  ON public.agent_telemarketing_mapping(chatwoot_agent_email);

CREATE INDEX IF NOT EXISTS idx_agent_telemarketing_user 
  ON public.agent_telemarketing_mapping(tabuladormax_user_id);

-- Enable RLS
ALTER TABLE public.agent_telemarketing_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view mappings"
  ON public.agent_telemarketing_mapping
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage mappings"
  ON public.agent_telemarketing_mapping
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_agent_telemarketing_mapping_updated_at
  BEFORE UPDATE ON public.agent_telemarketing_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();