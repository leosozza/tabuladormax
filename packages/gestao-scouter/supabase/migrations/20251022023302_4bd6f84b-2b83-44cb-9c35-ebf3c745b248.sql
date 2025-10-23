-- RLS Policies para permitir Edge Functions operarem com ANON_KEY
-- Necessário porque Lovable Cloud não expõe SERVICE_ROLE_KEY

-- 1. Permitir Edge Functions gerenciarem sync_queue
CREATE POLICY "Edge functions podem inserir sync_queue"
ON public.sync_queue
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Edge functions podem atualizar sync_queue"
ON public.sync_queue
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Edge functions podem deletar sync_queue"
ON public.sync_queue
FOR DELETE
TO authenticated, anon
USING (true);

-- 2. Permitir Edge Functions inserirem logs
CREATE POLICY "Edge functions podem inserir sync_logs"
ON public.sync_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Edge functions podem inserir sync_logs_detailed"
ON public.sync_logs_detailed
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 3. Permitir Edge Functions atualizarem leads (para sync)
CREATE POLICY "Edge functions podem inserir leads"
ON public.leads
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Edge functions podem atualizar leads"
ON public.leads
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 4. Permitir Edge Functions gerenciarem sync_status
CREATE POLICY "Edge functions podem inserir sync_status"
ON public.sync_status
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Edge functions podem atualizar sync_status"
ON public.sync_status
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);