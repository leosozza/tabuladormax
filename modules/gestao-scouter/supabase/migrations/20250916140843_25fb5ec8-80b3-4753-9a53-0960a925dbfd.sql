-- Create tables and related database objects for the Gestão Scouter project

-- Create bitrix_leads table
CREATE TABLE public.bitrix_leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bitrix_id INTEGER NOT NULL UNIQUE,
    etapa TEXT,
    data_de_criacao_da_ficha TIMESTAMP WITH TIME ZONE,
    primeiro_nome TEXT,
    nome_do_modelo TEXT,
    foto_do_modelo TEXT,
    telefone_de_trabalho TEXT,
    celular TEXT,
    local_da_abordagem TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    cep TEXT,
    ponto_de_referencia TEXT,
    altura_cm TEXT,
    medida_do_busto TEXT,
    medida_da_cintura TEXT,
    medida_do_quadril TEXT,
    manequim_de_roupa TEXT,
    numero_do_calcado TEXT,
    cor_dos_olhos TEXT,
    cor_do_cabelo TEXT,
    lead_score TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bitrix_sync_runs table
CREATE TABLE public.bitrix_sync_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'started',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT
);

-- Enable Row Level Security
ALTER TABLE public.bitrix_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_sync_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for bitrix_leads
CREATE POLICY "Users can view all bitrix_leads" 
ON public.bitrix_leads 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create bitrix_leads" 
ON public.bitrix_leads 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update bitrix_leads" 
ON public.bitrix_leads 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create policies for bitrix_sync_runs
CREATE POLICY "Users can view their own sync runs" 
ON public.bitrix_sync_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync runs" 
ON public.bitrix_sync_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync runs" 
ON public.bitrix_sync_runs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_bitrix_leads_bitrix_id ON public.bitrix_leads(bitrix_id);
CREATE INDEX idx_bitrix_leads_data_criacao ON public.bitrix_leads(data_de_criacao_da_ficha);
CREATE INDEX idx_bitrix_sync_runs_user_id ON public.bitrix_sync_runs(user_id);
CREATE INDEX idx_bitrix_sync_runs_status ON public.bitrix_sync_runs(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bitrix_leads_updated_at
    BEFORE UPDATE ON public.bitrix_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();