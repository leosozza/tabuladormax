-- Permitir que a service role (Edge Functions) faça download dos arquivos CSV
-- Necessário para process-large-csv-import funcionar

CREATE POLICY "Service role can access CSV files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'leads-csv-import');