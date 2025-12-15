-- Criar bucket para fotos de telemarketing
INSERT INTO storage.buckets (id, name, public)
VALUES ('telemarketing-photos', 'telemarketing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política pública de leitura
CREATE POLICY "telemarketing_photos_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'telemarketing-photos');

-- Política de upload para service role
CREATE POLICY "telemarketing_photos_service_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'telemarketing-photos');

-- Política de update para service role
CREATE POLICY "telemarketing_photos_service_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'telemarketing-photos');