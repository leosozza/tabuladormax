-- Deletar apenas os leads, preservando logs
DELETE FROM leads;

-- Verificar limpeza
-- SELECT COUNT(*) FROM leads; -- Deve retornar 0
-- SELECT COUNT(*) FROM actions_log; -- Logs preservados
-- SELECT COUNT(*) FROM call_logs; -- Logs preservados
-- SELECT COUNT(*) FROM sync_events; -- Logs preservados