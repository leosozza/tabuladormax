-- Correção 1: Resetar job travado para que possa ser retomado
-- Job ID: 9c307e97-f4b6-426c-98d4-0419e2c1ca99

UPDATE bitrix_import_jobs 
SET 
  status = 'paused',
  last_completed_date = '2024-10-15',
  processing_date = '2024-10-14',
  pause_reason = 'Reset manual - correção de job travado'
WHERE id = '9c307e97-f4b6-426c-98d4-0419e2c1ca99'
  AND status = 'running';