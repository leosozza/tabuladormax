-- Remover versão antiga/conflitante do RPC que pode causar ambiguidade
DROP FUNCTION IF EXISTS get_telemarketing_whatsapp_messages(integer, text, integer, integer);