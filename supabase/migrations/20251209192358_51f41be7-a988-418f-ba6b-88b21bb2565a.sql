-- Update status column to use new values
-- First, update existing records to map to new status values
UPDATE negotiations SET status = 'inicial' WHERE status = 'draft';
UPDATE negotiations SET status = 'ficha_preenchida' WHERE status = 'in_progress';
UPDATE negotiations SET status = 'atendimento_produtor' WHERE status = 'pending_approval';
UPDATE negotiations SET status = 'realizado' WHERE status IN ('approved', 'completed');
UPDATE negotiations SET status = 'nao_realizado' WHERE status IN ('rejected', 'cancelled');

-- Add a check constraint for valid status values
ALTER TABLE negotiations DROP CONSTRAINT IF EXISTS negotiations_status_check;
ALTER TABLE negotiations ADD CONSTRAINT negotiations_status_check 
  CHECK (status IN ('inicial', 'ficha_preenchida', 'atendimento_produtor', 'realizado', 'nao_realizado'));