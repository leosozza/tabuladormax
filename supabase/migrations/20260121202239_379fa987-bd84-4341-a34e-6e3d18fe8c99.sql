-- Drop the old function overloads without p_deal_status_filter parameter
DROP FUNCTION IF EXISTS public.get_admin_whatsapp_conversations(integer, integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.count_admin_whatsapp_conversations(text, text, text, text);