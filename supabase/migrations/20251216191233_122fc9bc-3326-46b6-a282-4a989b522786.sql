-- Criar bucket público para mídia WhatsApp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'whatsapp-media', 
  'whatsapp-media', 
  true,
  16777216, -- 16MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/3gpp', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Política: usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Política: leitura pública (necessário para Gupshup acessar a URL)
CREATE POLICY "Public read access for whatsapp media"
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'whatsapp-media');

-- Política: usuários autenticados podem deletar seus arquivos
CREATE POLICY "Authenticated users can delete their media"
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'whatsapp-media');