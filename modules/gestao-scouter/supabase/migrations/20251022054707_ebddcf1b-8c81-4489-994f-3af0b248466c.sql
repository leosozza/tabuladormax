-- Criar tabela de Projetos Comerciais do Bitrix24
CREATE TABLE IF NOT EXISTS public.bitrix_projetos_comerciais (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitrix_projetos_title ON public.bitrix_projetos_comerciais(title);

-- RLS para bitrix_projetos_comerciais
ALTER TABLE public.bitrix_projetos_comerciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bitrix_projetos_read" ON public.bitrix_projetos_comerciais
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "bitrix_projetos_write" ON public.bitrix_projetos_comerciais
  FOR ALL USING (true) WITH CHECK (true);

-- Criar tabela de Scouters do Bitrix24
CREATE TABLE IF NOT EXISTS public.bitrix_scouters (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  chave TEXT,
  geolocalizacao TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bitrix_scouters_title ON public.bitrix_scouters(title);
CREATE INDEX IF NOT EXISTS idx_bitrix_scouters_chave ON public.bitrix_scouters(chave);

-- RLS para bitrix_scouters
ALTER TABLE public.bitrix_scouters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bitrix_scouters_read" ON public.bitrix_scouters
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "bitrix_scouters_write" ON public.bitrix_scouters
  FOR ALL USING (true) WITH CHECK (true);

-- Adicionar colunas de referência Bitrix na tabela leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS bitrix_projeto_id BIGINT,
  ADD COLUMN IF NOT EXISTS bitrix_scouter_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_leads_bitrix_projeto_id ON public.leads(bitrix_projeto_id);
CREATE INDEX IF NOT EXISTS idx_leads_bitrix_scouter_id ON public.leads(bitrix_scouter_id);