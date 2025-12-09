-- Criar tabela producers (similar a scouters)
CREATE TABLE public.producers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bitrix_id integer UNIQUE,
  phone text,
  email text,
  photo_url text,
  status text NOT NULL DEFAULT 'ativo',
  access_key text UNIQUE,
  hired_at timestamptz,
  last_activity_at timestamptz,
  notes text,
  total_deals integer DEFAULT 0,
  deals_last_30_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Índices para performance
CREATE INDEX idx_producers_bitrix_id ON public.producers(bitrix_id);
CREATE INDEX idx_producers_access_key ON public.producers(access_key);
CREATE INDEX idx_producers_status ON public.producers(status);

-- Enable RLS
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins e managers podem gerenciar produtores"
ON public.producers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Produtores ativos são visíveis publicamente"
ON public.producers FOR SELECT
USING (status = 'ativo');

-- Trigger para updated_at
CREATE TRIGGER update_producers_updated_at
BEFORE UPDATE ON public.producers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para validar chave de acesso do produtor
CREATE OR REPLACE FUNCTION public.validate_producer_access_key(p_access_key text)
RETURNS TABLE(producer_id uuid, producer_name text, producer_photo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar last_activity_at do produtor
  UPDATE producers 
  SET last_activity_at = NOW() 
  WHERE access_key = p_access_key;
  
  RETURN QUERY
  SELECT 
    p.id as producer_id,
    p.name as producer_name,
    p.photo_url as producer_photo
  FROM producers p
  WHERE p.access_key = p_access_key
    AND p.status = 'ativo'
  LIMIT 1;
END;
$$;

-- Função para buscar deals do produtor
CREATE OR REPLACE FUNCTION public.get_producer_deals(
  p_producer_id uuid,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  deal_id uuid,
  bitrix_deal_id integer,
  title text,
  client_name text,
  client_phone text,
  opportunity numeric,
  stage_id text,
  negotiation_id uuid,
  negotiation_status text,
  created_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as deal_id,
    d.bitrix_deal_id,
    d.title,
    d.client_name,
    d.client_phone,
    d.opportunity,
    d.stage_id,
    n.id as negotiation_id,
    n.status as negotiation_status,
    d.created_date
  FROM deals d
  LEFT JOIN negotiations n ON n.deal_id = d.id
  WHERE d.producer_id = p_producer_id
    AND (p_status IS NULL OR n.status = p_status)
  ORDER BY d.created_date DESC
  LIMIT p_limit;
END;
$$;

-- Função para estatísticas do produtor
CREATE OR REPLACE FUNCTION public.get_producer_stats(p_producer_id uuid)
RETURNS TABLE(
  total_deals bigint,
  deals_pendentes bigint,
  deals_em_andamento bigint,
  deals_concluidos bigint,
  valor_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(d.id)::bigint as total_deals,
    COUNT(d.id) FILTER (WHERE n.status IN ('inicial', 'ficha_preenchida'))::bigint as deals_pendentes,
    COUNT(d.id) FILTER (WHERE n.status = 'atendimento_produtor')::bigint as deals_em_andamento,
    COUNT(d.id) FILTER (WHERE n.status IN ('realizado', 'nao_realizado'))::bigint as deals_concluidos,
    COALESCE(SUM(d.opportunity), 0) as valor_total
  FROM deals d
  LEFT JOIN negotiations n ON n.deal_id = d.id
  WHERE d.producer_id = p_producer_id;
END;
$$;