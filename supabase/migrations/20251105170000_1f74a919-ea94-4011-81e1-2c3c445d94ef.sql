-- Fase 1: Adicionar campos à tabela bitrix_field_mappings
ALTER TABLE bitrix_field_mappings
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS bitrix_field_type TEXT,
ADD COLUMN IF NOT EXISTS tabuladormax_field_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_sync_success TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- Fase 2: Criar tabela bitrix_fields_cache
CREATE TABLE IF NOT EXISTS bitrix_fields_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id TEXT NOT NULL UNIQUE,
  field_title TEXT,
  field_type TEXT,
  list_items JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fase 3: Criar tabela sync_test_results
CREATE TABLE IF NOT EXISTS sync_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('bitrix_to_supabase', 'supabase_to_bitrix')),
  preview_data JSONB NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by UUID REFERENCES auth.users(id),
  result TEXT CHECK (result IN ('success', 'error', 'skipped')),
  error_message TEXT
);

-- RLS para bitrix_fields_cache
ALTER TABLE bitrix_fields_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view bitrix fields cache"
ON bitrix_fields_cache FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Service role can manage bitrix fields cache"
ON bitrix_fields_cache FOR ALL
USING (true)
WITH CHECK (true);

-- RLS para sync_test_results
ALTER TABLE sync_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test results"
ON sync_test_results FOR SELECT
USING (
  executed_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can create test results"
ON sync_test_results FOR INSERT
WITH CHECK (executed_by = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bitrix_fields_cache_field_id ON bitrix_fields_cache(field_id);
CREATE INDEX IF NOT EXISTS idx_sync_test_results_lead_id ON sync_test_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_sync_test_results_executed_by ON sync_test_results(executed_by);
CREATE INDEX IF NOT EXISTS idx_bitrix_field_mappings_active ON bitrix_field_mappings(active) WHERE active = true;