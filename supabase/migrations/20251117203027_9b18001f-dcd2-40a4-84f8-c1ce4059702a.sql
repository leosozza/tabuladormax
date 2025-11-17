-- FASE 1: Adicionar colunas para sistema de checkpoint
ALTER TABLE csv_import_jobs 
ADD COLUMN IF NOT EXISTS last_checkpoint_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS timeout_reason TEXT;

-- FASE 3: Limpar jobs travados atuais

-- 3.1. Atualizar jobs travados há mais de 10 min com linhas processadas para 'paused'
UPDATE csv_import_jobs 
SET 
  status = 'paused',
  timeout_reason = 'Edge function timeout - pode ser retomado',
  last_checkpoint_at = COALESCE(last_checkpoint_at, NOW())
WHERE status = 'processing' 
  AND started_at < NOW() - INTERVAL '10 minutes'
  AND processed_rows IS NOT NULL 
  AND processed_rows > 0;

-- 3.2. Marcar jobs com 0 linhas como failed (não podem ser retomados)
UPDATE csv_import_jobs 
SET 
  status = 'failed',
  error_details = jsonb_build_array(
    jsonb_build_object(
      'error', 'Job não iniciou processamento antes do timeout',
      'timestamp', NOW()
    )
  ),
  completed_at = NOW()
WHERE status = 'processing' 
  AND (processed_rows IS NULL OR processed_rows = 0)
  AND started_at < NOW() - INTERVAL '10 minutes';