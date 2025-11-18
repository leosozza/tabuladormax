-- Fase 1: Adicionar colunas para cancelamento
ALTER TABLE lead_resync_jobs 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Fase 8: RLS Policy para permitir admins deletarem jobs inativos
CREATE POLICY "Admins podem deletar jobs inativos"
ON lead_resync_jobs
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND status IN ('completed', 'failed', 'cancelled')
);