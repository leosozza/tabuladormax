-- Limpar todas as tabelas para reimportação completa
-- Deletar logs relacionados primeiro (por causa das foreign keys)
DELETE FROM actions_log;
DELETE FROM call_logs;
DELETE FROM sync_events;

-- Deletar todos os leads
DELETE FROM leads;

-- Verificar limpeza (comentários para referência)
-- SELECT COUNT(*) FROM actions_log; -- Deve retornar 0
-- SELECT COUNT(*) FROM call_logs; -- Deve retornar 0
-- SELECT COUNT(*) FROM sync_events; -- Deve retornar 0
-- SELECT COUNT(*) FROM leads; -- Deve retornar 0