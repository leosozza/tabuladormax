-- Criar bucket para armazenar o APK do aplicativo
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-releases',
  'app-releases',
  true,
  104857600, -- 100MB
  ARRAY['application/vnd.android.package-archive']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket app-releases
-- Permitir que todos usuários autenticados façam download
CREATE POLICY "Usuários autenticados podem fazer download do APK"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'app-releases');

-- Apenas admins podem fazer upload
CREATE POLICY "Apenas admins podem fazer upload do APK"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-releases' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Apenas admins podem deletar
CREATE POLICY "Apenas admins podem deletar o APK"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-releases' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Criar tabela para metadados do APK
CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_latest BOOLEAN DEFAULT true,
  notes TEXT
);

-- RLS para app_releases
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Todos usuários autenticados podem ver releases
CREATE POLICY "Usuários autenticados podem ver releases"
ON public.app_releases FOR SELECT
TO authenticated
USING (true);

-- Apenas admins podem inserir
CREATE POLICY "Apenas admins podem criar releases"
ON public.app_releases FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para garantir que apenas uma versão seja marcada como latest
CREATE OR REPLACE FUNCTION public.update_latest_release()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_latest = true THEN
    UPDATE public.app_releases
    SET is_latest = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_latest_release
AFTER INSERT OR UPDATE OF is_latest ON public.app_releases
FOR EACH ROW
WHEN (NEW.is_latest = true)
EXECUTE FUNCTION public.update_latest_release();