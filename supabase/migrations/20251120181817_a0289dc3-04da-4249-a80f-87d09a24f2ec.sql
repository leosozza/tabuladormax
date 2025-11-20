-- Criar bucket público para fotos de leads vindas do Bitrix
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-photos', 
  'lead-photos', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Service role pode fazer upload (Edge Functions)
CREATE POLICY "Service role can upload lead photos"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'lead-photos');

-- RLS: Todos podem visualizar fotos públicas
CREATE POLICY "Anyone can view lead photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'lead-photos');

-- RLS: Service role pode deletar (para limpeza futura)
CREATE POLICY "Service role can delete lead photos"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'lead-photos');