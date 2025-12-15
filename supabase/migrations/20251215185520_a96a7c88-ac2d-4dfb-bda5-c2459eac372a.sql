-- Adicionar política para permitir leitura pública dos botões
-- Isso permite que operadores de telemarketing (sem auth Supabase) vejam os botões
CREATE POLICY "Anyone can view buttons publicly" 
ON public.button_config 
FOR SELECT 
TO anon 
USING (true);