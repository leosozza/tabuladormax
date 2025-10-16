-- Resetar jobs travados (mais de 10 minutos em processing)
UPDATE csv_import_jobs
SET status = 'failed',
    error_details = jsonb_build_array(
      jsonb_build_object('error', 'Job timeout - não processou após 10 minutos')
    )
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';