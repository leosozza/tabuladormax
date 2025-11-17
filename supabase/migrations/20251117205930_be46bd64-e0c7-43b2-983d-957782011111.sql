-- Marcar job atual travado como pausado para poder ser retomado
UPDATE csv_import_jobs 
SET 
  status = 'paused',
  timeout_reason = 'Edge function shutdown inesperado - pode ser retomado',
  last_checkpoint_at = COALESCE(last_checkpoint_at, NOW())
WHERE id = '276d3885-b0e9-448c-aef5-e6ff83e03ba5'
  AND status = 'processing';

-- Comentário: Este job travou em 3500 linhas e pode ser retomado após as correções