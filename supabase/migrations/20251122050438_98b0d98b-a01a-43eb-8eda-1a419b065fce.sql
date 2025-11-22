-- Adicionar campos de pagamento na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ficha_paga boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_pagamento timestamptz;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_ficha_paga ON public.leads(ficha_paga);
CREATE INDEX IF NOT EXISTS idx_leads_data_pagamento ON public.leads(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_leads_etapa_paga ON public.leads(etapa, ficha_paga) 
WHERE etapa = 'Scouter-fichas';

-- Comentários
COMMENT ON COLUMN public.leads.ficha_paga IS 'Indica se o scouter já foi pago por este lead';
COMMENT ON COLUMN public.leads.data_pagamento IS 'Data em que o pagamento foi aprovado/processado';

-- Função para marcar leads como pagos em massa (atualização retroativa)
CREATE OR REPLACE FUNCTION public.bulk_mark_as_paid(
  p_cutoff_date date,
  p_etapa text DEFAULT 'Scouter-fichas',
  p_project_id uuid DEFAULT NULL,
  p_scouter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated_count integer;
  v_lead_ids bigint[];
BEGIN
  -- Buscar IDs dos leads que serão atualizados
  SELECT array_agg(id) INTO v_lead_ids
  FROM leads
  WHERE 
    criado::date <= p_cutoff_date
    AND etapa = p_etapa
    AND (ficha_paga IS NOT TRUE OR ficha_paga IS NULL)
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter);
  
  -- Atualizar leads
  UPDATE leads
  SET 
    ficha_paga = true,
    data_pagamento = p_cutoff_date::timestamptz,
    updated_at = now()
  WHERE id = ANY(v_lead_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'cutoff_date', p_cutoff_date,
    'lead_ids', v_lead_ids
  );
END;
$$;

COMMENT ON FUNCTION public.bulk_mark_as_paid IS 'Marca leads como pagos em massa para atualização retroativa. Filtros opcionais por projeto e scouter.';

GRANT EXECUTE ON FUNCTION public.bulk_mark_as_paid TO authenticated;