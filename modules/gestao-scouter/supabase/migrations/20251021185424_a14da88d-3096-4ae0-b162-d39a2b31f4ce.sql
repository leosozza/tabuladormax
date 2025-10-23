-- ============================================================================
-- Migration: Adicionar campos faltantes para sincronização TabuladorMax
-- ============================================================================
-- Data: 2025-10-21
-- Descrição: Adiciona 4 campos que existem no TabuladorMax mas não no Gestão Scouter
-- ============================================================================

-- Adicionar campos de agendamento e ligação
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS data_criacao_agendamento timestamp with time zone,
  ADD COLUMN IF NOT EXISTS data_retorno_ligacao timestamp with time zone;

-- Adicionar campos de funil
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS funil_fichas text,
  ADD COLUMN IF NOT EXISTS gerenciamento_funil text;

-- Criar índices para melhorar performance em consultas
CREATE INDEX IF NOT EXISTS idx_leads_data_criacao_agendamento 
  ON public.leads(data_criacao_agendamento) 
  WHERE data_criacao_agendamento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_data_retorno_ligacao 
  ON public.leads(data_retorno_ligacao) 
  WHERE data_retorno_ligacao IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_funil_fichas 
  ON public.leads(funil_fichas) 
  WHERE funil_fichas IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_gerenciamento_funil 
  ON public.leads(gerenciamento_funil) 
  WHERE gerenciamento_funil IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.leads.data_criacao_agendamento IS 'Data de criação do agendamento (sync: TabuladorMax)';
COMMENT ON COLUMN public.leads.data_retorno_ligacao IS 'Data programada para retorno da ligação (sync: TabuladorMax)';
COMMENT ON COLUMN public.leads.funil_fichas IS 'Estágio do funil de fichas (sync: TabuladorMax)';
COMMENT ON COLUMN public.leads.gerenciamento_funil IS 'Status de gerenciamento do funil (sync: TabuladorMax)';

-- ============================================================================
-- Verificação
-- ============================================================================
DO $$
BEGIN
  -- Verificar se todos os campos foram criados
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name IN ('data_criacao_agendamento', 'data_retorno_ligacao', 'funil_fichas', 'gerenciamento_funil')
    HAVING COUNT(*) = 4
  ) THEN
    RAISE EXCEPTION 'Migration falhou: nem todos os campos foram criados';
  END IF;
  
  RAISE NOTICE '✓ Migration completa: 4 campos adicionados à tabela leads';
END $$;