-- Criar bucket para importações CSV
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Apenas admins podem fazer upload
CREATE POLICY "Admins podem fazer upload de CSVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'imports' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Admins podem listar e baixar CSVs
CREATE POLICY "Admins podem acessar CSVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'imports' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Admins podem deletar CSVs antigos
CREATE POLICY "Admins podem deletar CSVs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'imports' AND
  has_role(auth.uid(), 'admin'::app_role)
);