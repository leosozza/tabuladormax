-- Adicionar índice UNIQUE necessário para REFRESH CONCURRENTLY
-- A combinação (scouter, work_date) é naturalmente única
DROP INDEX IF EXISTS public.idx_timesheet_scouter;
DROP INDEX IF EXISTS public.idx_timesheet_date;

CREATE UNIQUE INDEX idx_timesheet_scouter_date_unique 
ON public.scouter_daily_timesheet (scouter, work_date);

-- Refresh inicial para garantir que está atualizado
REFRESH MATERIALIZED VIEW CONCURRENTLY public.scouter_daily_timesheet;