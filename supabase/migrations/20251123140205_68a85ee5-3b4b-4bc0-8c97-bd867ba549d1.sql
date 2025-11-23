-- Revogar acesso público à view materializada
REVOKE ALL ON scouter_daily_timesheet FROM anon;
REVOKE ALL ON scouter_daily_timesheet FROM authenticated;

-- Apenas service_role e postgres podem acessar diretamente
GRANT SELECT ON scouter_daily_timesheet TO service_role;