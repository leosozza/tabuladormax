-- Atualizar função bulk_mark_as_paid para tornar p_etapa opcional e adicionar filtros de scouter e valor_ficha
CREATE OR REPLACE FUNCTION public.bulk_mark_as_paid(
  p_cutoff_date date,
  p_etapa text DEFAULT NULL,
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
    AND (p_etapa IS NULL OR etapa = p_etapa)
    AND (ficha_paga IS NOT TRUE OR ficha_paga IS NULL)
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
    AND (p_scouter IS NULL OR scouter = p_scouter)
    AND scouter IS NOT NULL
    AND valor_ficha IS NOT NULL;
  
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