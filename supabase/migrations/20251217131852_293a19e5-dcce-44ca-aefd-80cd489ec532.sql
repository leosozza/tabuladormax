-- Tabela para armazenar configurações de atalhos de botões por agente
CREATE TABLE public.agent_button_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_telemarketing_id INTEGER NOT NULL,
  button_config_id UUID REFERENCES public.button_config(id) ON DELETE CASCADE,
  hotkey VARCHAR(10),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bitrix_telemarketing_id, button_config_id)
);

-- Índices para performance
CREATE INDEX idx_agent_button_shortcuts_bitrix_id ON public.agent_button_shortcuts(bitrix_telemarketing_id);
CREATE INDEX idx_agent_button_shortcuts_button_id ON public.agent_button_shortcuts(button_config_id);

-- RLS
ALTER TABLE public.agent_button_shortcuts ENABLE ROW LEVEL SECURITY;

-- Política: qualquer pessoa autenticada pode ler
CREATE POLICY "Authenticated users can read agent button shortcuts"
ON public.agent_button_shortcuts
FOR SELECT
TO authenticated
USING (true);

-- Política: agentes podem inserir/atualizar seus próprios atalhos
CREATE POLICY "Agents can manage their own button shortcuts"
ON public.agent_button_shortcuts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_agent_button_shortcuts_updated_at
BEFORE UPDATE ON public.agent_button_shortcuts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.agent_button_shortcuts IS 'Configurações de atalhos de botões personalizados por agente';
COMMENT ON COLUMN public.agent_button_shortcuts.bitrix_telemarketing_id IS 'ID do agente no Bitrix';
COMMENT ON COLUMN public.agent_button_shortcuts.hotkey IS 'Tecla de atalho (1-9, etc)';
COMMENT ON COLUMN public.agent_button_shortcuts.sort_order IS 'Ordem de exibição do botão';
COMMENT ON COLUMN public.agent_button_shortcuts.is_visible IS 'Se o botão está visível para o agente';