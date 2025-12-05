-- Adicionar campo de prioridade ao roadmap_features
ALTER TABLE roadmap_features 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' 
CHECK (priority IN ('critical', 'high', 'medium', 'low'));

-- Definir prioridades iniciais baseado no status
UPDATE roadmap_features SET priority = 'high' WHERE status = 'in-progress';
UPDATE roadmap_features SET priority = 'critical' WHERE status = 'beta';
UPDATE roadmap_features SET priority = 'medium' WHERE status = 'planned';
UPDATE roadmap_features SET priority = 'low' WHERE status = 'active';

-- Corrigir datas de lançamento para 2025
UPDATE roadmap_features SET launch_date = '2025-01-15' WHERE status = 'active' AND module = 'admin' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-02-01' WHERE status = 'active' AND module = 'telemarketing' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-02-15' WHERE status = 'active' AND module = 'gestao-scouter' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-03-01' WHERE status = 'active' AND module = 'agenciamento' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-03-15' WHERE status = 'active' AND module = 'discador' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-04-01' WHERE status = 'active' AND module = 'integracoes' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-05-01' WHERE status = 'active' AND module = 'geral' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-06-01' WHERE status = 'beta' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-07-01' WHERE status = 'in-progress' AND launch_date IS NULL;
UPDATE roadmap_features SET launch_date = '2025-09-01' WHERE status = 'planned' AND launch_date IS NULL;

-- Criar tabela para diagramas de processos BPMN
CREATE TABLE process_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'processo',
  module TEXT,
  diagram_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE process_diagrams ENABLE ROW LEVEL SECURITY;

-- Policies: Todos podem visualizar diagramas publicados, admins/managers podem gerenciar
CREATE POLICY "Todos podem ver diagramas publicados" ON process_diagrams
FOR SELECT USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins e managers podem criar diagramas" ON process_diagrams
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins e managers podem atualizar diagramas" ON process_diagrams
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins e managers podem deletar diagramas" ON process_diagrams
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_process_diagrams_updated_at
  BEFORE UPDATE ON process_diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir diagramas de exemplo
INSERT INTO process_diagrams (name, description, category, module, is_published, diagram_data) VALUES
('Ciclo de Vida do Lead', 'Fluxo completo desde captação até fechamento', 'processo', 'telemarketing', true, '{"nodes": [], "edges": []}'),
('Sincronização Bitrix', 'Fluxo de sincronização de dados com Bitrix24', 'integracao', 'integracoes', true, '{"nodes": [], "edges": []}'),
('Processo de Agenciamento', 'Fluxo de agenciamento de modelos', 'processo', 'agenciamento', true, '{"nodes": [], "edges": []}'),
('Arquitetura do Sistema', 'Visão geral da arquitetura técnica', 'arquitetura', 'geral', true, '{"nodes": [], "edges": []}');