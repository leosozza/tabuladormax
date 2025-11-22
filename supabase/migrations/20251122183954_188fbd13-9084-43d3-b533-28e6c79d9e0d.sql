-- Adicionar políticas RLS para DELETE e UPDATE em app_releases
CREATE POLICY "Admins can delete releases"
ON app_releases
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update releases"
ON app_releases
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Políticas do Storage Bucket app-releases
CREATE POLICY "Admins can delete app release files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-releases' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can upload app release files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-releases' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Corrigir trigger para garantir apenas 1 release como latest
DROP TRIGGER IF EXISTS set_latest_release ON app_releases;

CREATE TRIGGER set_latest_release
  BEFORE INSERT OR UPDATE ON app_releases
  FOR EACH ROW
  EXECUTE FUNCTION update_latest_release();

-- Deletar versões duplicadas, mantendo apenas a mais recente de cada versão
DELETE FROM app_releases
WHERE id NOT IN (
  SELECT DISTINCT ON (version) id
  FROM app_releases
  ORDER BY version, uploaded_at DESC
);

-- Limpar dados: desmarcar todos como latest
UPDATE app_releases SET is_latest = false;

-- Marcar apenas o mais recente como latest
UPDATE app_releases 
SET is_latest = true 
WHERE id = (
  SELECT id FROM app_releases 
  ORDER BY uploaded_at DESC 
  LIMIT 1
);

-- Adicionar constraint de unicidade para prevenir duplicação
ALTER TABLE app_releases 
ADD CONSTRAINT unique_version UNIQUE (version);

-- Criar índice único para garantir apenas 1 latest por vez
CREATE UNIQUE INDEX idx_single_latest 
ON app_releases (is_latest) 
WHERE is_latest = true;