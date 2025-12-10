-- Dropar função existente e recriar com lead_id
DROP FUNCTION IF EXISTS public.get_producer_deals(uuid, text, integer);

CREATE FUNCTION public.get_producer_deals(
  p_producer_id uuid,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  deal_id uuid,
  bitrix_deal_id integer,
  title text,
  client_name text,
  client_phone text,
  opportunity numeric,
  stage_id text,
  negotiation_id uuid,
  negotiation_status text,
  created_date timestamptz,
  lead_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as deal_id,
    d.bitrix_deal_id,
    d.title,
    d.client_name,
    d.client_phone,
    d.opportunity,
    d.stage_id,
    n.id as negotiation_id,
    n.status as negotiation_status,
    d.created_date,
    d.lead_id
  FROM deals d
  LEFT JOIN negotiations n ON n.deal_id = d.id
  WHERE d.producer_id = p_producer_id
    AND (p_status IS NULL OR n.status = p_status)
  ORDER BY d.created_date DESC
  LIMIT p_limit;
END;
$$;