-- Corrigir RPC get_scouter_template_history para usar colunas corretas
-- A coluna error_reason não existe em whatsapp_messages - usar metadata->>'error_reason' ou NULL

DROP FUNCTION IF EXISTS public.get_scouter_template_history(bigint, text, integer);

CREATE OR REPLACE FUNCTION public.get_scouter_template_history(
  p_lead_id bigint,
  p_phone_normalized text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id text,
  created_at timestamptz,
  status text,
  error_reason text,
  template_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_variants text[];
BEGIN
  -- Criar variações do telefone (com/sem 9 após DDD)
  IF length(p_phone_normalized) = 13 THEN
    -- Telefone com 9 dígitos - também buscar sem o 9
    v_phone_variants := ARRAY[
      p_phone_normalized,
      substring(p_phone_normalized from 1 for 4) || substring(p_phone_normalized from 6)
    ];
  ELSIF length(p_phone_normalized) = 12 THEN
    -- Telefone com 8 dígitos - também buscar com o 9
    v_phone_variants := ARRAY[
      p_phone_normalized,
      substring(p_phone_normalized from 1 for 4) || '9' || substring(p_phone_normalized from 5)
    ];
  ELSE
    v_phone_variants := ARRAY[p_phone_normalized];
  END IF;

  RETURN QUERY
  SELECT 
    w.id::text,
    w.created_at,
    w.status,
    -- Tentar pegar error_reason do metadata se existir
    (w.metadata->>'error_reason')::text AS error_reason,
    w.template_name
  FROM whatsapp_messages w
  WHERE 
    w.template_name IS NOT NULL
    AND w.direction = 'outbound'
    AND (
      w.phone_number = ANY(v_phone_variants)
      OR (p_lead_id > 0 AND w.bitrix_id = p_lead_id::text)
    )
  ORDER BY w.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scouter_template_history(bigint, text, integer) TO authenticated;