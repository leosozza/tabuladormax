-- Correção 1: Adicionar política RLS para service_role inserir em sync_events
CREATE POLICY "Service role can insert sync events"
ON sync_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- Correção 5: Popular sync_events com dados históricos dos leads já importados
INSERT INTO sync_events (event_type, direction, lead_id, status, created_at)
SELECT 
  'create' as event_type,
  'bitrix_to_supabase' as direction,
  id as lead_id,
  'success' as status,
  COALESCE(last_sync_at, NOW()) as created_at
FROM leads
WHERE sync_source = 'bitrix'
ON CONFLICT DO NOTHING;