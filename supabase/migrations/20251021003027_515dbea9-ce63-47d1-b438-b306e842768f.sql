-- ============================================
-- 🔧 CORREÇÕES TABULADORMAX - Sincronização Gestão Scouter
-- ============================================

-- 1️⃣ Garantir que coluna 'updated_at' existe na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2️⃣ Popular 'updated_at' com base em colunas existentes
UPDATE public.leads
SET updated_at = COALESCE(
    updated_at,
    date_modify,
    criado,
    NOW()
)
WHERE updated_at IS NULL;

-- 3️⃣ Criar índice para performance da sincronização
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

-- 4️⃣ Garantir que trigger automática para atualizar 'updated_at' existe
-- (a função update_updated_at_column já existe no sistema)
DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5️⃣ Criar policy para o 'service_role' acessar leads (se RLS estiver habilitado)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'leads' 
    AND rowsecurity = true
  ) THEN
    DROP POLICY IF EXISTS "service_role_full_access" ON public.leads;
    CREATE POLICY "service_role_full_access"
    ON public.leads
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 6️⃣ Atualizar configuração do Gestão Scouter com novas credenciais
UPDATE public.gestao_scouter_config
SET 
  project_url = 'https://jstsrgyxrrlklnzgsihd.supabase.co',
  anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg',
  sync_enabled = true,
  active = true,
  updated_at = NOW()
WHERE active = true;

-- Se não existir nenhuma config ativa, criar uma nova
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  sync_enabled,
  active
)
SELECT 
  'https://jstsrgyxrrlklnzgsihd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.gestao_scouter_config WHERE active = true);

-- 7️⃣ Adicionar coluna fields_selected na tabela gestao_scouter_export_jobs se não existir
ALTER TABLE public.gestao_scouter_export_jobs
ADD COLUMN IF NOT EXISTS fields_selected TEXT[];

-- 8️⃣ Criar índices adicionais para melhor performance
CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_status 
ON public.gestao_scouter_export_jobs(status);

CREATE INDEX IF NOT EXISTS idx_gestao_scouter_export_jobs_created_by 
ON public.gestao_scouter_export_jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_sync_events_direction 
ON public.sync_events(direction, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_events_lead_id 
ON public.sync_events(lead_id, created_at DESC);