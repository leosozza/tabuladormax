-- Criar políticas corretas para o bucket leads-csv-import
-- owner é UUID, owner_id é TEXT

-- Política para permitir que usuários deletem seus próprios arquivos
CREATE POLICY "Users can delete own CSV files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leads-csv-import' 
  AND auth.uid() = owner
);

-- Política para permitir admins deletarem qualquer arquivo  
CREATE POLICY "Admins can delete any CSV files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leads-csv-import' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política de SELECT (necessário para listar antes de deletar)
CREATE POLICY "Users can view own CSV files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'leads-csv-import' 
  AND auth.uid() = owner
);

-- Admins podem ver todos os arquivos
CREATE POLICY "Admins can view all CSV files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'leads-csv-import' 
  AND has_role(auth.uid(), 'admin'::app_role)
);