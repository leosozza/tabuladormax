-- Performance Monitoring Tables
-- This migration creates tables for storing performance metrics from the application

-- Create enum for metric types
CREATE TYPE metric_type AS ENUM (
  'web_vital',
  'query',
  'chart',
  'edge_function',
  'custom'
);

-- Create enum for alert levels
CREATE TYPE alert_level AS ENUM (
  'info',
  'warning',
  'error',
  'critical'
);

-- Table for storing performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_type metric_type NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for efficient queries
  INDEX idx_metrics_name (metric_name),
  INDEX idx_metrics_type (metric_type),
  INDEX idx_metrics_created_at (created_at)
);

-- Table for storing performance alerts
CREATE TABLE IF NOT EXISTS performance_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_level alert_level NOT NULL,
  message TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  threshold DECIMAL,
  metadata JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for efficient queries
  INDEX idx_alerts_level (alert_level),
  INDEX idx_alerts_acknowledged (acknowledged),
  INDEX idx_alerts_created_at (created_at)
);

-- Table for storing query performance logs
CREATE TABLE IF NOT EXISTS query_performance_logs (
  id BIGSERIAL PRIMARY KEY,
  query_key TEXT NOT NULL,
  duration_ms DECIMAL NOT NULL,
  status TEXT NOT NULL,
  data_size_bytes BIGINT,
  cached BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for efficient queries
  INDEX idx_query_logs_key (query_key),
  INDEX idx_query_logs_duration (duration_ms),
  INDEX idx_query_logs_created_at (created_at)
);

-- Table for storing edge function telemetry
CREATE TABLE IF NOT EXISTS edge_function_telemetry (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  execution_time_ms DECIMAL NOT NULL,
  status TEXT NOT NULL,
  status_code INTEGER,
  memory_used_bytes BIGINT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for efficient queries
  INDEX idx_edge_telemetry_name (function_name),
  INDEX idx_edge_telemetry_status (status),
  INDEX idx_edge_telemetry_created_at (created_at)
);

-- View for slow queries (queries taking >2 seconds)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query_key,
  COUNT(*) as occurrence_count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
  MAX(created_at) as last_occurrence
FROM query_performance_logs
WHERE duration_ms > 2000
GROUP BY query_key
ORDER BY avg_duration_ms DESC;

-- View for slow edge functions (functions taking >5 seconds)
CREATE OR REPLACE VIEW slow_edge_functions AS
SELECT 
  function_name,
  COUNT(*) as execution_count,
  AVG(execution_time_ms) as avg_execution_ms,
  MAX(execution_time_ms) as max_execution_ms,
  MIN(execution_time_ms) as min_execution_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_ms,
  COUNT(*) FILTER (WHERE status = 'error') as error_count,
  MAX(created_at) as last_execution
FROM edge_function_telemetry
WHERE execution_time_ms > 5000
GROUP BY function_name
ORDER BY avg_execution_ms DESC;

-- View for performance summary
CREATE OR REPLACE VIEW performance_summary AS
SELECT
  metric_type,
  metric_name,
  COUNT(*) as sample_count,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as median_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99_value
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_type, metric_name
ORDER BY metric_type, avg_value DESC;

-- Function to clean up old metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM performance_metrics WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM performance_alerts WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM query_performance_logs WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM edge_function_telemetry WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies

-- Allow authenticated users to read all performance data
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to alerts"
  ON performance_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to query logs"
  ON query_performance_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to edge telemetry"
  ON edge_function_telemetry FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update all tables
CREATE POLICY "Allow service role full access to metrics"
  ON performance_metrics
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to alerts"
  ON performance_alerts
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to query logs"
  ON query_performance_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to edge telemetry"
  ON edge_function_telemetry
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow managers to acknowledge alerts
CREATE POLICY "Allow managers to acknowledge alerts"
  ON performance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('gerente', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('gerente', 'admin')
    )
  );

-- Comments for documentation
COMMENT ON TABLE performance_metrics IS 'Stores application performance metrics including Web Vitals, query times, and chart rendering';
COMMENT ON TABLE performance_alerts IS 'Stores performance alerts that require attention';
COMMENT ON TABLE query_performance_logs IS 'Logs React Query performance data';
COMMENT ON TABLE edge_function_telemetry IS 'Telemetry data from Supabase Edge Functions';
COMMENT ON VIEW slow_queries IS 'Identifies queries taking longer than 2 seconds';
COMMENT ON VIEW slow_edge_functions IS 'Identifies Edge Functions taking longer than 5 seconds';
COMMENT ON VIEW performance_summary IS 'Statistical summary of performance metrics from last 24 hours';
