-- Criar tabela telemarketing_operators
CREATE TABLE public.telemarketing_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bitrix_id INTEGER UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  cargo TEXT DEFAULT 'agente',
  access_key TEXT UNIQUE,
  supervisor_id UUID REFERENCES public.telemarketing_operators(id),
  status TEXT DEFAULT 'ativo',
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX idx_telemarketing_access_key ON public.telemarketing_operators(access_key) WHERE access_key IS NOT NULL;
CREATE INDEX idx_telemarketing_cargo ON public.telemarketing_operators(cargo);
CREATE INDEX idx_telemarketing_supervisor ON public.telemarketing_operators(supervisor_id);

-- Enable RLS
ALTER TABLE public.telemarketing_operators ENABLE ROW LEVEL SECURITY;

-- Política para validação pública de chave de acesso (sem auth)
CREATE POLICY "Allow public access key validation" 
ON public.telemarketing_operators FOR SELECT
USING (true);

-- Política para admins e managers gerenciarem
CREATE POLICY "Admins and managers can manage telemarketing operators" 
ON public.telemarketing_operators FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_telemarketing_operators_updated_at
BEFORE UPDATE ON public.telemarketing_operators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC para validar chave de acesso
CREATE OR REPLACE FUNCTION public.validate_telemarketing_access_key(p_access_key TEXT)
RETURNS TABLE (
  operator_id UUID,
  operator_name TEXT,
  operator_photo TEXT,
  bitrix_id INTEGER,
  cargo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar last_activity_at
  UPDATE telemarketing_operators 
  SET last_activity_at = NOW() 
  WHERE access_key = p_access_key;
  
  RETURN QUERY
  SELECT 
    t.id as operator_id,
    t.name as operator_name,
    t.photo_url as operator_photo,
    t.bitrix_id,
    t.cargo
  FROM telemarketing_operators t
  WHERE t.access_key = p_access_key
    AND t.status = 'ativo'
  LIMIT 1;
END;
$$;