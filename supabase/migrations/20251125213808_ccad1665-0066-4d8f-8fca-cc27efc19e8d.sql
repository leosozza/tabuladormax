-- Adicionar coluna photo_url na tabela bitrix_spa_entities
ALTER TABLE bitrix_spa_entities
ADD COLUMN photo_url TEXT;

-- Criar bucket para fotos dos scouters
INSERT INTO storage.buckets (id, name, public)
VALUES ('scouter-photos', 'scouter-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública
CREATE POLICY "Public Read Scouter Photos" ON storage.objects
FOR SELECT USING (bucket_id = 'scouter-photos');

-- Política de upload via service role
CREATE POLICY "Service Role Upload Scouter Photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'scouter-photos' AND auth.role() = 'service_role');