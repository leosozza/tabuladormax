-- Habilitar REPLICA IDENTITY FULL para capturar dados completos nas atualizações
ALTER TABLE public.negotiations REPLICA IDENTITY FULL;

-- Adicionar tabela negotiations ao publication de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiations;