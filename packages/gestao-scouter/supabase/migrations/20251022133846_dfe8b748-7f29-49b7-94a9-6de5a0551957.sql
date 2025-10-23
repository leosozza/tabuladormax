-- 1. Criar bucket para armazenar CSVs temporariamente (até 5GB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'csv-imports',
  'csv-imports',
  false,
  5368709120,
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS para bucket (usuários autenticados podem fazer upload)
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'csv-imports');

CREATE POLICY "Usuários podem ver seus próprios arquivos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'csv-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem deletar seus próprios arquivos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'csv-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Tabela para rastrear jobs de importação
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  target_table TEXT NOT NULL DEFAULT 'leads',
  column_mapping JSONB NOT NULL,
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  inserted_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_message TEXT,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- RLS para import_jobs
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios jobs"
ON import_jobs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Usuários criam seus próprios jobs"
ON import_jobs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Edge functions atualizam jobs"
ON import_jobs FOR UPDATE
TO authenticated
USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_import_jobs_user_status ON import_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);