-- Remover a constraint antiga que referencia profiles
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_producer_id_fkey;

-- Adicionar nova constraint referenciando producers
ALTER TABLE deals 
ADD CONSTRAINT deals_producer_id_fkey 
FOREIGN KEY (producer_id) REFERENCES producers(id) ON DELETE SET NULL;