-- Criar tabela batch_update_jobs para atualização em lote
CREATE TABLE IF NOT EXISTS batch_update_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  field_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  updated_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE batch_update_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can manage batch updates"
ON batch_update_jobs
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can view own batch updates"
ON batch_update_jobs
FOR SELECT
USING (created_by = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_batch_update_jobs_updated_at
BEFORE UPDATE ON batch_update_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();