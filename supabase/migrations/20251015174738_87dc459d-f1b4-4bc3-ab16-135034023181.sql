-- Adicionar coluna transfer_conversation à tabela button_config
ALTER TABLE public.button_config 
ADD COLUMN IF NOT EXISTS transfer_conversation boolean DEFAULT false;