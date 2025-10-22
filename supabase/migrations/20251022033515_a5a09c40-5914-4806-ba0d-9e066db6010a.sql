-- Permitir leitura pública da tabela leads para sincronização com Gestão Scouter
-- IMPORTANTE: Apenas SELECT, sem INSERT/UPDATE/DELETE
-- Necessário para Health Check e fallback REST API

CREATE POLICY "Allow anon read leads for sync" 
ON public.leads 
FOR SELECT 
TO anon 
USING (true);