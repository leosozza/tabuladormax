-- Criar tabela scouters
CREATE TABLE scouters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas
  name TEXT NOT NULL,
  bitrix_id INTEGER UNIQUE,
  
  -- Contato
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  photo_url TEXT,
  
  -- Status e gestão
  status TEXT NOT NULL DEFAULT 'ativo' 
    CHECK (status IN ('ativo', 'inativo', 'standby', 'blacklist')),
  
  -- Pessoa responsável (gestor do scouter)
  responsible_user_id UUID REFERENCES auth.users(id),
  
  -- Metadados
  hired_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Performance (denormalizado para performance)
  total_leads INTEGER DEFAULT 0,
  leads_last_30_days INTEGER DEFAULT 0
);

-- Índices para performance
CREATE INDEX idx_scouters_status ON scouters(status);
CREATE INDEX idx_scouters_bitrix_id ON scouters(bitrix_id);
CREATE INDEX idx_scouters_responsible ON scouters(responsible_user_id);
CREATE INDEX idx_scouters_name ON scouters(name);

-- RLS Policies
ALTER TABLE scouters ENABLE ROW LEVEL SECURITY;

-- Admins e managers podem gerenciar tudo
CREATE POLICY "Admins and managers can manage scouters"
  ON scouters FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Todos podem ver scouters
CREATE POLICY "All users can view scouters"
  ON scouters FOR SELECT
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_scouters_updated_at
  BEFORE UPDATE ON scouters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Popular tabela scouters com dados de bitrix_spa_entities
INSERT INTO scouters (name, bitrix_id, status, created_at)
SELECT 
  title,
  bitrix_item_id,
  'ativo'::TEXT,
  cached_at
FROM bitrix_spa_entities
WHERE entity_type_id = 1096
ON CONFLICT (bitrix_id) DO NOTHING;

-- Atualizar contadores de performance
UPDATE scouters s
SET 
  total_leads = (
    SELECT COUNT(*) 
    FROM leads l 
    WHERE l.scouter = s.name
  ),
  leads_last_30_days = (
    SELECT COUNT(*) 
    FROM leads l 
    WHERE l.scouter = s.name 
    AND l.criado >= NOW() - INTERVAL '30 days'
  ),
  last_activity_at = (
    SELECT MAX(l.criado)
    FROM leads l
    WHERE l.scouter = s.name
  );

-- Função para obter performance detalhada de um scouter
CREATE OR REPLACE FUNCTION get_scouter_performance_detail(p_scouter_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  scouter_name TEXT;
BEGIN
  -- Buscar nome do scouter
  SELECT name INTO scouter_name FROM scouters WHERE id = p_scouter_id;
  
  IF scouter_name IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;
  
  SELECT jsonb_build_object(
    'total_leads', COUNT(*),
    'confirmed_leads', COUNT(*) FILTER (WHERE ficha_confirmada = true),
    'attended_leads', COUNT(*) FILTER (WHERE compareceu = true),
    'total_value', COALESCE(SUM(valor_ficha), 0),
    'conversion_rate', 
      CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE ficha_confirmada = true)::NUMERIC / COUNT(*)) * 100, 2)
        ELSE 0
      END,
    'leads_by_month', (
      SELECT COALESCE(jsonb_object_agg(month_str, count), '{}'::JSONB)
      FROM (
        SELECT 
          TO_CHAR(criado, 'YYYY-MM') as month_str,
          COUNT(*) as count
        FROM leads
        WHERE scouter = scouter_name
          AND criado >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(criado, 'YYYY-MM')
        ORDER BY month_str DESC
      ) sub
    ),
    'top_projects', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('project', projeto_comercial, 'count', count)
        ORDER BY count DESC
      ), '[]'::JSONB)
      FROM (
        SELECT projeto_comercial, COUNT(*) as count
        FROM leads
        WHERE scouter = scouter_name
          AND projeto_comercial IS NOT NULL
        GROUP BY projeto_comercial
        ORDER BY count DESC
        LIMIT 5
      ) sub
    )
  ) INTO result
  FROM leads
  WHERE scouter = scouter_name;
  
  RETURN COALESCE(result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;