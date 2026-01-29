-- Remove a versão duplicada da função com p_lead_id bigint
-- Isso resolve o erro PGRST203 de ambiguidade no PostgREST
DROP FUNCTION IF EXISTS public.get_telemarketing_whatsapp_messages(
  integer, text, bigint, integer[], integer
);