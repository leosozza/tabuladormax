-- Drop all existing tables
DROP TABLE IF EXISTS public.bitrix_sync_runs CASCADE;
DROP TABLE IF EXISTS public.bitrix_leads CASCADE;
DROP TABLE IF EXISTS public.scouter_profiles CASCADE;
DROP TABLE IF EXISTS public.scouter_tiers CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS public.vw_funil_semana CASCADE;
DROP VIEW IF EXISTS public.vw_projecao_scouter CASCADE;
DROP VIEW IF EXISTS public.vw_quality_semana CASCADE;

-- Create the new fichas table based on the Google Sheets structure
CREATE TABLE public.fichas (
    id BIGINT PRIMARY KEY,
    projetos TEXT,
    scouter TEXT,
    criado TEXT,
    hora_criacao_ficha TEXT,
    valor_ficha TEXT,
    etapa TEXT,
    nome TEXT,
    gerenciamentofunil TEXT,
    etapafunil TEXT,
    modelo TEXT,
    localizacao TEXT,
    ficha_confirmada TEXT,
    idade TEXT,
    local_da_abordagem TEXT,
    cadastro_existe_foto TEXT,
    presenca_confirmada TEXT,
    supervisor_do_scouter TEXT,
    data_confirmacao_ficha TEXT,
    foto TEXT,
    compareceu TEXT,
    confirmado TEXT,
    datahoracel TEXT,
    funilfichas TEXT,
    tabulacao TEXT,
    agendado TEXT,
    qdoagendou TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this replaces the previous system)
CREATE POLICY "Everyone can view fichas" 
ON public.fichas 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert fichas" 
ON public.fichas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update fichas" 
ON public.fichas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete fichas" 
ON public.fichas 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_fichas_scouter ON public.fichas(scouter);
CREATE INDEX idx_fichas_projetos ON public.fichas(projetos);
CREATE INDEX idx_fichas_etapa ON public.fichas(etapa);
CREATE INDEX idx_fichas_criado ON public.fichas(criado);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fichas_updated_at
BEFORE UPDATE ON public.fichas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();