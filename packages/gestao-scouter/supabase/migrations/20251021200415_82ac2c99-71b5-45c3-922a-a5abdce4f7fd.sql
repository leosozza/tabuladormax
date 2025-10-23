-- Correção definitiva das políticas RLS para permitir UPSERT na tabela leads
-- Problema: política antiga tinha USING (true) mas faltava WITH CHECK (true) para UPDATE

-- 1. Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "leads_admin_all" ON public.leads;
DROP POLICY IF EXISTS "leads_authenticated_read" ON public.leads;
DROP POLICY IF EXISTS "service_role_upsert_leads" ON public.leads;
DROP POLICY IF EXISTS "Usuários autenticados podem ver leads" ON public.leads;
DROP POLICY IF EXISTS "Serviço pode inserir leads" ON public.leads;
DROP POLICY IF EXISTS "Serviço e usuários podem atualizar leads" ON public.leads;
DROP POLICY IF EXISTS "Permitir UPSERT de sincronização" ON public.leads;
DROP POLICY IF EXISTS "Permitir UPSERT público para sincronização" ON public.leads;
DROP POLICY IF EXISTS "Permitir todas operações para sincronização" ON public.leads;

-- 2. Criar política completa e correta para UPSERT
-- Esta política permite SELECT, INSERT, UPDATE e DELETE
-- USING (true) = permite visualizar/ler o registro (necessário para SELECT e UPDATE)
-- WITH CHECK (true) = permite inserir/modificar o registro (necessário para INSERT e UPDATE)
CREATE POLICY "leads_full_access"
  ON public.leads
  FOR ALL                          -- Aplica a SELECT, INSERT, UPDATE, DELETE
  TO public, anon, authenticated   -- Aplica a conexões anônimas e autenticadas
  USING (true)                     -- ✅ Permite ler/visualizar registros
  WITH CHECK (true);               -- ✅ Permite inserir/modificar registros

-- 3. Recarregar o schema cache do PostgREST (CRÍTICO para aplicar mudanças)
NOTIFY pgrst, 'reload schema';