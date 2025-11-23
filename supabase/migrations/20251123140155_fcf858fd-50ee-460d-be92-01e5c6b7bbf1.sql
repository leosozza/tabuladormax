-- Habilitar RLS na view materializada
ALTER MATERIALIZED VIEW scouter_daily_timesheet OWNER TO postgres;

-- Criar política RLS para a view materializada
-- Como é uma view materializada, não podemos usar RLS diretamente
-- Vamos criar uma view normal com RLS em cima da materializada
CREATE OR REPLACE VIEW scouter_timesheet_secure AS
SELECT * FROM scouter_daily_timesheet;

-- Habilitar RLS na view segura
ALTER VIEW scouter_timesheet_secure SET (security_invoker = true);

-- Grant permissões
GRANT SELECT ON scouter_timesheet_secure TO authenticated;
GRANT SELECT ON scouter_timesheet_secure TO service_role;