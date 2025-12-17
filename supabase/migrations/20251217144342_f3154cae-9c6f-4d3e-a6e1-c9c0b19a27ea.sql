-- Função para obter ranking diário de agendados por operador
CREATE OR REPLACE FUNCTION get_daily_agendados_ranking()
RETURNS TABLE (bitrix_telemarketing_id bigint, operator_name text, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.bitrix_telemarketing_id::bigint,
    COALESCE(atm.bitrix_telemarketing_name, l.op_telemarketing, 'Operador')::text as operator_name,
    COUNT(*)::bigint as total
  FROM leads l
  LEFT JOIN agent_telemarketing_mapping atm ON atm.bitrix_telemarketing_id = l.bitrix_telemarketing_id
  WHERE l.etapa = 'Agendados'
    AND l.date_modify::date = CURRENT_DATE
    AND l.bitrix_telemarketing_id IS NOT NULL
  GROUP BY l.bitrix_telemarketing_id, atm.bitrix_telemarketing_name, l.op_telemarketing
  ORDER BY total DESC;
END;
$$;

-- Inserir campo "Nome do Modelo" na tabela profile_field_mapping (se existir)
INSERT INTO profile_field_mapping (
  profile_field, 
  chatwoot_field, 
  display_name, 
  is_profile_photo, 
  sort_order
) VALUES (
  'nome_modelo', 
  'contact.custom_attributes.nome_modelo', 
  'Nome do Modelo', 
  false, 
  2
) ON CONFLICT DO NOTHING;