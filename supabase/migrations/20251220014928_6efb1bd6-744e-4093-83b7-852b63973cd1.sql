-- Tabela principal de documentação de páginas/áreas
CREATE TABLE app_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  page_route TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'page',
  module TEXT NOT NULL DEFAULT 'admin',
  main_component TEXT,
  hooks_used JSONB DEFAULT '[]',
  rpcs_used JSONB DEFAULT '[]',
  tables_accessed JSONB DEFAULT '[]',
  filters_available JSONB DEFAULT '[]',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_updated_by UUID
);

-- Tabela de documentação de métricas individuais
CREATE TABLE app_metrics_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id UUID REFERENCES app_documentation(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_key TEXT,
  data_source TEXT NOT NULL,
  source_type TEXT DEFAULT 'table',
  fields_used JSONB DEFAULT '[]',
  calculation_formula TEXT,
  filters_applied TEXT,
  sql_example TEXT,
  field_explanations JSONB DEFAULT '{}',
  business_rule TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de documentação de campos específicos
CREATE TABLE app_field_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id TEXT NOT NULL UNIQUE,
  field_name TEXT NOT NULL,
  field_source TEXT,
  field_type TEXT,
  description TEXT,
  usage_examples JSONB DEFAULT '[]',
  possible_values JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_metrics_documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_field_documentation ENABLE ROW LEVEL SECURITY;

-- Policies for app_documentation
CREATE POLICY "Authenticated users can view documentation"
ON app_documentation FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage documentation"
ON app_documentation FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Policies for app_metrics_documentation
CREATE POLICY "Authenticated users can view metrics documentation"
ON app_metrics_documentation FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage metrics documentation"
ON app_metrics_documentation FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Policies for app_field_documentation
CREATE POLICY "Authenticated users can view field documentation"
ON app_field_documentation FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage field documentation"
ON app_field_documentation FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Indexes
CREATE INDEX idx_app_documentation_module ON app_documentation(module);
CREATE INDEX idx_app_documentation_category ON app_documentation(category);
CREATE INDEX idx_app_metrics_documentation_doc_id ON app_metrics_documentation(documentation_id);
CREATE INDEX idx_app_field_documentation_field_id ON app_field_documentation(field_id);