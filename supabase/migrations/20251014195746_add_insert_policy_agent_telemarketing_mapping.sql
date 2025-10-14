-- Permite INSERT na tabela agent_telemarketing_mapping para usuários autenticados
-- Remove a política existente que restringe usuários a criar apenas seus próprios mapeamentos
DROP POLICY IF EXISTS "Users can create their own mapping" ON public.agent_telemarketing_mapping;

-- Cria nova política que permite qualquer usuário autenticado inserir mapeamentos
CREATE POLICY "Authenticated users can insert mappings"
  ON public.agent_telemarketing_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
