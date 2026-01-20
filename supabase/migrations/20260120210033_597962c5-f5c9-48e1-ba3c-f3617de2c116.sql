-- Remover a função antiga com INTEGER para resolver o conflito de overloading
DROP FUNCTION IF EXISTS public.get_telemarketing_metrics(timestamptz, timestamptz, integer, integer[]);