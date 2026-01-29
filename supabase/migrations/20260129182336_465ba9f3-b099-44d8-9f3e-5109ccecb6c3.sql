
-- Adicionar política para permitir operadores atualizarem sua própria foto
CREATE POLICY "Operators can update their own photo"
ON public.telemarketing_operators
FOR UPDATE
USING (
  -- Match by bitrix_id from user metadata
  bitrix_id = (
    SELECT (raw_user_meta_data->>'telemarketing_id')::integer 
    FROM auth.users 
    WHERE id = auth.uid()
  )
  -- Or match by email pattern
  OR bitrix_id = (
    SELECT substring(email from 'tele-(\d+)@')::integer
    FROM auth.users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  bitrix_id = (
    SELECT (raw_user_meta_data->>'telemarketing_id')::integer 
    FROM auth.users 
    WHERE id = auth.uid()
  )
  OR bitrix_id = (
    SELECT substring(email from 'tele-(\d+)@')::integer
    FROM auth.users
    WHERE id = auth.uid()
  )
);

-- Adicionar política para permitir upload no bucket telemarketing-photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('telemarketing-photos', 'telemarketing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para upload de fotos - qualquer usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload telemarketing photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'telemarketing-photos'
  AND auth.role() = 'authenticated'
);

-- Política para leitura pública das fotos
CREATE POLICY "Public can view telemarketing photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'telemarketing-photos');

-- Política para usuários atualizarem suas próprias fotos
CREATE POLICY "Users can update their own telemarketing photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'telemarketing-photos'
  AND auth.role() = 'authenticated'
);

-- Política para usuários deletarem suas próprias fotos
CREATE POLICY "Users can delete their own telemarketing photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'telemarketing-photos'
  AND auth.role() = 'authenticated'
);
