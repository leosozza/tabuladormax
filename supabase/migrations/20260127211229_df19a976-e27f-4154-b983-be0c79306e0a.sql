
-- Drop and recreate the RPC without the is_active reference
DROP FUNCTION IF EXISTS get_my_invited_conversations(UUID);

CREATE OR REPLACE FUNCTION get_my_invited_conversations(p_operator_id UUID)
RETURNS TABLE (
  phone_number TEXT,
  bitrix_id TEXT,
  priority INTEGER,
  invited_by UUID,
  inviter_name TEXT,
  invited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.phone_number,
    p.bitrix_id,
    COALESCE(p.priority, 0) as priority,
    p.invited_by,
    p.inviter_name,
    p.invited_at
  FROM whatsapp_conversation_participants p
  WHERE p.operator_id = p_operator_id
  ORDER BY p.priority DESC NULLS LAST, p.invited_at DESC;
END;
$$;
