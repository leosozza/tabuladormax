-- Tabela para armazenar API Keys
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT DEFAULT 0
);

-- Índices
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_created_by ON api_keys(created_by);

-- Trigger para updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins podem gerenciar API keys"
  ON api_keys FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver suas próprias API keys"
  ON api_keys FOR SELECT
  USING (created_by = auth.uid());

-- Tabela para log de uso das API Keys
CREATE TABLE public.api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas de uso
CREATE INDEX idx_api_key_usage_logs_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);

-- RLS para logs
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver todos os logs"
  ON api_key_usage_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver logs de suas keys"
  ON api_key_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys 
      WHERE api_keys.id = api_key_usage_logs.api_key_id 
      AND api_keys.created_by = auth.uid()
    )
  );

-- Função para validar API Key
CREATE OR REPLACE FUNCTION validate_api_key(
  p_key TEXT,
  p_required_scope TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  key_id UUID,
  key_name TEXT,
  scopes TEXT[],
  rate_limit INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_hash TEXT;
  v_key_record RECORD;
BEGIN
  -- Gerar hash da chave fornecida
  v_key_hash := encode(sha256(p_key::bytea), 'hex');
  
  -- Buscar a chave
  SELECT 
    ak.id,
    ak.name,
    ak.scopes,
    ak.rate_limit_per_minute,
    ak.is_active,
    ak.expires_at
  INTO v_key_record
  FROM api_keys ak
  WHERE ak.key_hash = v_key_hash;
  
  -- Chave não encontrada
  IF v_key_record IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT[],
      NULL::INTEGER,
      'API key inválida'::TEXT;
    RETURN;
  END IF;
  
  -- Chave inativa
  IF NOT v_key_record.is_active THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_key_record.id,
      v_key_record.name,
      v_key_record.scopes,
      v_key_record.rate_limit_per_minute,
      'API key desativada'::TEXT;
    RETURN;
  END IF;
  
  -- Chave expirada
  IF v_key_record.expires_at IS NOT NULL AND v_key_record.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_key_record.id,
      v_key_record.name,
      v_key_record.scopes,
      v_key_record.rate_limit_per_minute,
      'API key expirada'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar escopo se fornecido
  IF p_required_scope IS NOT NULL AND NOT (p_required_scope = ANY(v_key_record.scopes) OR '*' = ANY(v_key_record.scopes)) THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      v_key_record.id,
      v_key_record.name,
      v_key_record.scopes,
      v_key_record.rate_limit_per_minute,
      format('Escopo "%s" não autorizado', p_required_scope)::TEXT;
    RETURN;
  END IF;
  
  -- Atualizar contadores
  UPDATE api_keys 
  SET 
    last_used_at = NOW(),
    usage_count = usage_count + 1
  WHERE id = v_key_record.id;
  
  -- Retornar sucesso
  RETURN QUERY SELECT 
    true::BOOLEAN,
    v_key_record.id,
    v_key_record.name,
    v_key_record.scopes,
    v_key_record.rate_limit_per_minute,
    NULL::TEXT;
END;
$$;

-- Função para gerar API Key (retorna a chave em texto apenas uma vez)
CREATE OR REPLACE FUNCTION generate_api_key(
  p_name TEXT,
  p_scopes TEXT[] DEFAULT ARRAY['*'],
  p_description TEXT DEFAULT NULL,
  p_rate_limit INTEGER DEFAULT 60,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  key_id UUID,
  api_key TEXT,
  key_prefix TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
  v_key_id UUID;
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar API keys';
  END IF;
  
  -- Gerar chave aleatória: tmx_live_32caracteres
  v_raw_key := 'tmx_live_' || encode(gen_random_bytes(24), 'hex');
  v_key_prefix := substring(v_raw_key from 1 for 16);
  v_key_hash := encode(sha256(v_raw_key::bytea), 'hex');
  
  -- Inserir no banco
  INSERT INTO api_keys (
    name,
    description,
    key_hash,
    key_prefix,
    scopes,
    rate_limit_per_minute,
    expires_at,
    created_by
  ) VALUES (
    p_name,
    p_description,
    v_key_hash,
    v_key_prefix,
    p_scopes,
    p_rate_limit,
    p_expires_at,
    auth.uid()
  )
  RETURNING id INTO v_key_id;
  
  -- Retornar a chave (ÚNICA VEZ que será visível)
  RETURN QUERY SELECT 
    v_key_id,
    v_raw_key,
    v_key_prefix;
END;
$$;

-- Função para revogar API Key
CREATE OR REPLACE FUNCTION revoke_api_key(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar API keys';
  END IF;
  
  UPDATE api_keys
  SET is_active = false, updated_at = NOW()
  WHERE id = p_key_id;
  
  RETURN FOUND;
END;
$$;

-- Função para rotacionar API Key
CREATE OR REPLACE FUNCTION rotate_api_key(p_key_id UUID)
RETURNS TABLE(
  key_id UUID,
  api_key TEXT,
  key_prefix TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem rotacionar API keys';
  END IF;
  
  -- Gerar nova chave
  v_raw_key := 'tmx_live_' || encode(gen_random_bytes(24), 'hex');
  v_key_prefix := substring(v_raw_key from 1 for 16);
  v_key_hash := encode(sha256(v_raw_key::bytea), 'hex');
  
  -- Atualizar no banco
  UPDATE api_keys
  SET 
    key_hash = v_key_hash,
    key_prefix = v_key_prefix,
    updated_at = NOW(),
    usage_count = 0
  WHERE id = p_key_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'API key não encontrada';
  END IF;
  
  -- Retornar nova chave
  RETURN QUERY SELECT 
    p_key_id,
    v_raw_key,
    v_key_prefix;
END;
$$;