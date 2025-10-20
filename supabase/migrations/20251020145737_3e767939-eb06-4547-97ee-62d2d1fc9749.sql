-- Adicionar coluna sync_error na tabela leads para armazenar mensagens de erro de sincronização
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'sync_error'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN sync_error TEXT;
    RAISE NOTICE 'Coluna sync_error adicionada à tabela leads';
  END IF;
END $$;

-- Criar índice para facilitar queries de leads com erro
CREATE INDEX IF NOT EXISTS idx_leads_sync_error ON public.leads(sync_error) WHERE sync_error IS NOT NULL;

-- Adicionar comentário
COMMENT ON COLUMN public.leads.sync_error IS 'Mensagem de erro da última tentativa de sincronização, NULL se não houver erro';