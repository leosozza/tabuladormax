-- Criar bucket para fotos dos operadores
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política para visualizar fotos (público)
CREATE POLICY "Fotos são públicas"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Política para upload de fotos (qualquer usuário autenticado ou anônimo por enquanto)
CREATE POLICY "Qualquer um pode fazer upload de fotos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Política para atualizar fotos
CREATE POLICY "Qualquer um pode atualizar fotos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars');

-- Política para deletar fotos
CREATE POLICY "Qualquer um pode deletar fotos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars');