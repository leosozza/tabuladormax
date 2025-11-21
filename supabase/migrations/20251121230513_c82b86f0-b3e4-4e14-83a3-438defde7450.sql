-- Tabela para armazenar templates do Gupshup
CREATE TABLE IF NOT EXISTS gupshup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT UNIQUE NOT NULL,
  element_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  template_body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  preview_url TEXT,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gupshup_templates_status ON gupshup_templates(status);
CREATE INDEX IF NOT EXISTS idx_gupshup_templates_category ON gupshup_templates(category);

-- Habilitar RLS
ALTER TABLE gupshup_templates ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler templates aprovados
CREATE POLICY "Todos podem ler templates aprovados"
  ON gupshup_templates FOR SELECT
  USING (status = 'APPROVED');

-- Política: Service role pode gerenciar tudo
CREATE POLICY "Service role pode gerenciar templates"
  ON gupshup_templates FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tabela para permissões de templates por agente
CREATE TABLE IF NOT EXISTS agent_template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES gupshup_templates(id) ON DELETE CASCADE,
  department TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_permissions_user ON agent_template_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_permissions_template ON agent_template_permissions(template_id);

-- Habilitar RLS
ALTER TABLE agent_template_permissions ENABLE ROW LEVEL SECURITY;

-- Política: Usuário vê suas próprias permissões
CREATE POLICY "Usuário vê suas permissões"
  ON agent_template_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Admin gerencia permissões
CREATE POLICY "Admin gerencia permissões"
  ON agent_template_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_gupshup_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gupshup_templates_updated_at
  BEFORE UPDATE ON gupshup_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_gupshup_templates_updated_at();