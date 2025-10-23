-- =============================================
-- POPULAR CONFIGURAÇÃO DO TABULADORMAX
-- =============================================

-- Inserir configuração padrão do TabuladorMax
INSERT INTO public.tabulador_config (project_id, url, publishable_key, enabled)
VALUES (
  'gkvvtfqfggddzotxltxf',
  'https://gkvvtfqfggddzotxltxf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU',
  true
)
ON CONFLICT (project_id) DO UPDATE
SET 
  url = EXCLUDED.url,
  publishable_key = EXCLUDED.publishable_key,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

-- Criar registro inicial de status de sincronização (usando UUID válido)
INSERT INTO public.sync_status (id, project_name, status, last_run_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'TabuladorMax',
  'idle',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  project_name = EXCLUDED.project_name,
  status = EXCLUDED.status,
  last_run_at = EXCLUDED.last_run_at;

-- Comentários
COMMENT ON TABLE public.tabulador_config IS 'Configuração do projeto TabuladorMax para sincronização bidirecional';
COMMENT ON TABLE public.sync_status IS 'Status atual das sincronizações ativas no sistema';