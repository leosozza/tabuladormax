-- Drop existing functions
DROP FUNCTION IF EXISTS generate_api_key(TEXT, TEXT[], TEXT, INTEGER, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS revoke_api_key(UUID);
DROP FUNCTION IF EXISTS rotate_api_key(UUID);

-- Recreate generate_api_key with user_id parameter
CREATE OR REPLACE FUNCTION generate_api_key(
  p_name TEXT,
  p_scopes TEXT[] DEFAULT ARRAY['*'],
  p_description TEXT DEFAULT NULL,
  p_rate_limit INTEGER DEFAULT 60,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (key_id UUID, api_key TEXT, key_prefix TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
  v_key_id UUID;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Verificar se é admin
  IF NOT has_role(v_user_id, 'admin') THEN
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
    v_user_id
  )
  RETURNING id INTO v_key_id;
  
  -- Retornar a chave (ÚNICA VEZ que será visível)
  RETURN QUERY SELECT 
    v_key_id,
    v_raw_key,
    v_key_prefix;
END;
$$;

-- Recreate revoke_api_key with user_id parameter
CREATE OR REPLACE FUNCTION revoke_api_key(
  p_key_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF NOT has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar API keys';
  END IF;
  
  UPDATE api_keys
  SET is_active = false, updated_at = now()
  WHERE id = p_key_id;
  
  RETURN FOUND;
END;
$$;

-- Recreate rotate_api_key with user_id parameter
CREATE OR REPLACE FUNCTION rotate_api_key(
  p_key_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (key_id UUID, api_key TEXT, key_prefix TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF NOT has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem rotacionar API keys';
  END IF;
  
  -- Gerar nova chave
  v_raw_key := 'tmx_live_' || encode(gen_random_bytes(24), 'hex');
  v_key_prefix := substring(v_raw_key from 1 for 16);
  v_key_hash := encode(sha256(v_raw_key::bytea), 'hex');
  
  -- Atualizar a chave existente
  UPDATE api_keys
  SET 
    key_hash = v_key_hash,
    key_prefix = v_key_prefix,
    updated_at = now(),
    usage_count = 0
  WHERE id = p_key_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'API Key não encontrada';
  END IF;
  
  RETURN QUERY SELECT 
    p_key_id,
    v_raw_key,
    v_key_prefix;
END;
$$;