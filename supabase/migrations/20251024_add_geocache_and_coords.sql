-- Tabela para cache de geocodificação
CREATE TABLE IF NOT EXISTS geocache (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_geocache_query ON geocache(query);

-- Comentários
COMMENT ON TABLE geocache IS 'Cache de geocodificação para evitar chamadas repetidas à API';
COMMENT ON COLUMN geocache.query IS 'Endereço ou localização buscada';
COMMENT ON COLUMN geocache.lat IS 'Latitude do resultado';
COMMENT ON COLUMN geocache.lng IS 'Longitude do resultado';

-- Adicionar colunas latitude e longitude na tabela leads se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE leads ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE leads ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
END $$;

-- Índice para buscas geoespaciais
CREATE INDEX IF NOT EXISTS idx_leads_lat_lng ON leads(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comentários nas novas colunas
COMMENT ON COLUMN leads.latitude IS 'Latitude do lead (preenchida por geocodificação)';
COMMENT ON COLUMN leads.longitude IS 'Longitude do lead (preenchida por geocodificação)';
