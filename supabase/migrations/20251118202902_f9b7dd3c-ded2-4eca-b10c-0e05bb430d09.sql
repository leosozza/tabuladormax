-- Remover a constraint antiga que não inclui 'cancelled'
ALTER TABLE lead_resync_jobs 
DROP CONSTRAINT IF EXISTS lead_resync_jobs_status_check;

-- Adicionar nova constraint incluindo 'cancelled'
ALTER TABLE lead_resync_jobs
ADD CONSTRAINT lead_resync_jobs_status_check 
CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled'));