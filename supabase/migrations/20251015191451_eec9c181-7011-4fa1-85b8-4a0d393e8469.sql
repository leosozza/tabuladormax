-- Adicionar política para permitir que usuários criem mapeamento para si mesmos
DROP POLICY IF EXISTS "Users can create their own mapping" ON public.agent_telemarketing_mapping;

CREATE POLICY "Users can create their own mapping" 
ON public.agent_telemarketing_mapping 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = tabuladormax_user_id);

-- Permitir que usuários atualizem seu próprio mapeamento
DROP POLICY IF EXISTS "Users can update their own mapping" ON public.agent_telemarketing_mapping;

CREATE POLICY "Users can update their own mapping" 
ON public.agent_telemarketing_mapping 
FOR UPDATE
TO authenticated
USING (auth.uid() = tabuladormax_user_id)
WITH CHECK (auth.uid() = tabuladormax_user_id);