-- Criar bucket para fotos de leads (público) se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-photos', 'lead-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Anyone can upload lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update lead photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete lead photos" ON storage.objects;

-- RLS para permitir uploads de fotos (público mas com validação)
CREATE POLICY "Anyone can upload lead photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lead-photos' 
  AND (storage.foldername(name))[1] ~ '^[0-9]+$'
);

CREATE POLICY "Anyone can view lead photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lead-photos');

CREATE POLICY "Anyone can update lead photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'lead-photos')
WITH CHECK (bucket_id = 'lead-photos');

CREATE POLICY "Anyone can delete lead photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'lead-photos');