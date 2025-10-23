-- Tabelas de controle de sincronização entre Gestão Scouter e TabuladorMax

-- Logs de sincronização
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_direction text NOT NULL CHECK (sync_direction IN ('gestao_to_tabulador', 'tabulador_to_gestao', 'bidirectional')),
  records_synced integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  errors jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  processing_time_ms integer
);

-- Índices para sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_direction ON sync_logs(sync_direction);

-- Status de sincronização
CREATE TABLE IF NOT EXISTS sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL UNIQUE CHECK (project_name IN ('gestao_scouter', 'tabulador_max')),
  last_sync_at timestamptz,
  last_sync_success boolean,
  total_records integer DEFAULT 0,
  last_error text,
  updated_at timestamptz DEFAULT now()
);

-- Índice para sync_status
CREATE INDEX IF NOT EXISTS idx_sync_status_project ON sync_status(project_name);

-- Inserir registros iniciais de status
INSERT INTO sync_status (project_name, last_sync_at, last_sync_success, total_records)
VALUES 
  ('gestao_scouter', now(), true, 0),
  ('tabulador_max', null, null, 0)
ON CONFLICT (project_name) DO NOTHING;

-- RLS Policies para sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sync logs"
  ON sync_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert sync logs"
  ON sync_logs
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies para sync_status
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync status"
  ON sync_status
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can update sync status"
  ON sync_status
  FOR ALL
  USING (true);
