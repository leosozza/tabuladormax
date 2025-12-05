-- Adicionar campo access_key na tabela scouters
ALTER TABLE scouters ADD COLUMN IF NOT EXISTS access_key TEXT UNIQUE;

-- Criar índice para busca rápida por access_key
CREATE INDEX IF NOT EXISTS idx_scouters_access_key ON scouters(access_key) WHERE access_key IS NOT NULL;

-- Criar RPC para estatísticas do portal do scouter
CREATE OR REPLACE FUNCTION public.get_scouter_portal_stats(
  p_scouter_name TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total BIGINT,
  com_foto BIGINT,
  confirmados BIGINT,
  agendados BIGINT,
  reagendar BIGINT,
  compareceram BIGINT,
  pendentes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE cadastro_existe_foto = true)::BIGINT as com_foto,
    COUNT(*) FILTER (WHERE ficha_confirmada = true)::BIGINT as confirmados,
    COUNT(*) FILTER (WHERE etapa = 'Agendados')::BIGINT as agendados,
    COUNT(*) FILTER (WHERE etapa = 'Reagendar')::BIGINT as reagendar,
    COUNT(*) FILTER (WHERE etapa IN ('CONVERTED', 'Lead convertido') AND date_closed IS NOT NULL)::BIGINT as compareceram,
    COUNT(*) FILTER (WHERE qualidade_lead IS NULL)::BIGINT as pendentes
  FROM leads
  WHERE scouter = p_scouter_name
    AND fonte_normalizada = 'Scouter - Fichas'
    AND (p_start_date IS NULL OR criado >= p_start_date)
    AND (p_end_date IS NULL OR criado <= p_end_date)
    AND (p_project_id IS NULL OR commercial_project_id = p_project_id);
END;
$$;

-- Criar RPC para buscar projetos do scouter
CREATE OR REPLACE FUNCTION public.get_scouter_projects(p_scouter_name TEXT)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  project_code TEXT,
  lead_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as project_id,
    cp.name as project_name,
    cp.code as project_code,
    COUNT(l.id)::BIGINT as lead_count
  FROM leads l
  INNER JOIN commercial_projects cp ON l.commercial_project_id = cp.id
  WHERE l.scouter = p_scouter_name
    AND l.fonte_normalizada = 'Scouter - Fichas'
  GROUP BY cp.id, cp.name, cp.code
  ORDER BY lead_count DESC;
END;
$$;

-- Criar RPC para validar access_key e retornar dados do scouter
CREATE OR REPLACE FUNCTION public.validate_scouter_access_key(p_access_key TEXT)
RETURNS TABLE (
  scouter_id UUID,
  scouter_name TEXT,
  scouter_photo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as scouter_id,
    s.name as scouter_name,
    s.photo_url as scouter_photo
  FROM scouters s
  WHERE s.access_key = p_access_key
  LIMIT 1;
END;
$$;

-- Permissões para funções públicas (sem auth)
GRANT EXECUTE ON FUNCTION public.get_scouter_portal_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scouter_projects TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_scouter_access_key TO anon, authenticated;