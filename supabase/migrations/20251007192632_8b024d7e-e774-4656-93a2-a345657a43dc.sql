-- Corrigir políticas RLS para permitir acesso anônimo

-- Remover políticas antigas de leads
DROP POLICY IF EXISTS "Leads are viewable by everyone" ON public.leads;
DROP POLICY IF EXISTS "Leads can be inserted by anyone" ON public.leads;
DROP POLICY IF EXISTS "Leads can be updated by anyone" ON public.leads;

-- Criar novas políticas para leads (permitir tudo sem auth)
CREATE POLICY "Enable all access for leads"
  ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Remover políticas antigas de button_config
DROP POLICY IF EXISTS "Button config is viewable by everyone" ON public.button_config;
DROP POLICY IF EXISTS "Button config can be modified by anyone" ON public.button_config;
DROP POLICY IF EXISTS "Botões são acessíveis por todos autenticados" ON public.button_config;

-- Criar nova política para button_config (permitir tudo sem auth)
CREATE POLICY "Enable all access for button_config"
  ON public.button_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Remover políticas antigas de actions_log
DROP POLICY IF EXISTS "Logs are viewable by everyone" ON public.actions_log;
DROP POLICY IF EXISTS "Logs can be inserted by anyone" ON public.actions_log;
DROP POLICY IF EXISTS "Logs são acessíveis por todos autenticados" ON public.actions_log;

-- Criar nova política para actions_log (permitir tudo sem auth)
CREATE POLICY "Enable all access for actions_log"
  ON public.actions_log
  FOR ALL
  USING (true)
  WITH CHECK (true);