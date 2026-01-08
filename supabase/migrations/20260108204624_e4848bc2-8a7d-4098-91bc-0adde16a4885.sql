-- =========================================
-- SIMPLIFICAR RLS PARA TELEMARKETING
-- Tornar tabelas operacionais acessíveis sem sessão auth
-- =========================================

-- 1. WHATSAPP_MESSAGES - Leitura pública
DROP POLICY IF EXISTS "Users can view accessible messages" ON whatsapp_messages;
CREATE POLICY "Allow public read whatsapp messages"
ON whatsapp_messages FOR SELECT
USING (true);

-- 2. LEAD_SEARCH_CACHE - Leitura e escrita pública (é cache)
DROP POLICY IF EXISTS "Allow authenticated users to read lead search cache" ON lead_search_cache;
DROP POLICY IF EXISTS "Allow authenticated users to insert lead search cache" ON lead_search_cache;
DROP POLICY IF EXISTS "Allow authenticated users to update lead search cache" ON lead_search_cache;

CREATE POLICY "Allow public read lead search cache"
ON lead_search_cache FOR SELECT
USING (true);

CREATE POLICY "Allow public insert lead search cache"
ON lead_search_cache FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update lead search cache"
ON lead_search_cache FOR UPDATE
USING (true) WITH CHECK (true);

-- 3. ACTIONS_LOG - Leitura e escrita pública
DROP POLICY IF EXISTS "Users can view action logs for accessible leads" ON actions_log;
DROP POLICY IF EXISTS "Users can insert action logs" ON actions_log;

CREATE POLICY "Allow public read actions log"
ON actions_log FOR SELECT
USING (true);

CREATE POLICY "Allow public insert actions log"
ON actions_log FOR INSERT
WITH CHECK (true);

-- 4. AGENT_TELEMARKETING_MAPPING - Insert público
DROP POLICY IF EXISTS "Users can create their own mapping" ON agent_telemarketing_mapping;

CREATE POLICY "Allow public insert mapping"
ON agent_telemarketing_mapping FOR INSERT
WITH CHECK (true);