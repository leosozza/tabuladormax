-- Adicionar política RLS para deletar jobs finalizados
CREATE POLICY "Admins podem deletar import jobs"
ON csv_import_jobs FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  status IN ('failed', 'completed', 'completed_with_errors')
);

-- Limpar jobs travados há mais de 10 minutos
UPDATE csv_import_jobs 
SET 
  status = 'failed',
  error_details = jsonb_build_array(
    jsonb_build_object(
      'error', 'Job travado - timeout de processamento',
      'reason', 'Arquivo muito grande ou edge function ficou sem recursos',
      'timestamp', NOW()
    )
  ),
  completed_at = NOW()
WHERE status = 'processing' 
  AND (processed_rows IS NULL OR processed_rows = 0)
  AND started_at < NOW() - INTERVAL '10 minutes';