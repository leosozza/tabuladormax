-- Create projection system tables and views

-- Create scouter_tiers table for tier progression system
CREATE TABLE public.scouter_tiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tier_name TEXT NOT NULL UNIQUE,
    tier_order INTEGER NOT NULL UNIQUE,
    min_fichas_per_week INTEGER NOT NULL DEFAULT 0,
    max_fichas_per_week INTEGER,
    conversion_rate_min DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    conversion_rate_max DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    bonus_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scouter_profiles table
CREATE TABLE public.scouter_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    scouter_name TEXT NOT NULL UNIQUE,
    current_tier_id UUID REFERENCES public.scouter_tiers(id),
    fichas_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    weekly_goal INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scouter_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouter_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for scouter_tiers (public read, admin write)
CREATE POLICY "Everyone can view tiers" 
ON public.scouter_tiers 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage tiers" 
ON public.scouter_tiers 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create policies for scouter_profiles
CREATE POLICY "Everyone can view scouter profiles" 
ON public.scouter_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create profiles" 
ON public.scouter_profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profiles" 
ON public.scouter_profiles 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Insert tier data (Iniciante → Gestor)
INSERT INTO public.scouter_tiers (tier_name, tier_order, min_fichas_per_week, max_fichas_per_week, conversion_rate_min, conversion_rate_max, bonus_multiplier) VALUES
('Iniciante', 1, 0, 10, 5.00, 15.00, 1.00),
('Aprendiz', 2, 11, 20, 10.00, 25.00, 1.10),
('Junior', 3, 21, 35, 20.00, 35.00, 1.25),
('Pleno', 4, 36, 50, 30.00, 45.00, 1.40),
('Senior', 5, 51, 70, 40.00, 60.00, 1.60),
('Especialista', 6, 71, 90, 55.00, 75.00, 1.80),
('Gestor', 7, 91, NULL, 70.00, 90.00, 2.00);

-- Create weekly funnel view
CREATE OR REPLACE VIEW public.vw_funil_semana AS
SELECT 
    DATE_TRUNC('week', bl.data_de_criacao_da_ficha) as semana,
    COUNT(*) as total_fichas,
    COUNT(CASE WHEN bl.etapa = 'CONVERTIDO' THEN 1 END) as convertidos,
    ROUND(
        (COUNT(CASE WHEN bl.etapa = 'CONVERTIDO' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as taxa_conversao,
    AVG(sp.fichas_value) as valor_medio_ficha
FROM public.bitrix_leads bl
LEFT JOIN public.scouter_profiles sp ON sp.scouter_name = bl.primeiro_nome
WHERE bl.data_de_criacao_da_ficha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
GROUP BY DATE_TRUNC('week', bl.data_de_criacao_da_ficha)
ORDER BY semana DESC;

-- Create weekly quality view
CREATE OR REPLACE VIEW public.vw_quality_semana AS
SELECT 
    DATE_TRUNC('week', bl.data_de_criacao_da_ficha) as semana,
    bl.primeiro_nome as scouter,
    COUNT(*) as total_fichas,
    COUNT(CASE WHEN bl.etapa = 'CONVERTIDO' THEN 1 END) as convertidos,
    ROUND(
        (COUNT(CASE WHEN bl.etapa = 'CONVERTIDO' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as taxa_conversao_individual,
    st.tier_name,
    st.conversion_rate_min,
    st.conversion_rate_max,
    CASE 
        WHEN ROUND((COUNT(CASE WHEN bl.etapa = 'CONVERTIDO' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2) >= st.conversion_rate_max THEN 'Excelente'
        WHEN ROUND((COUNT(CASE WHEN bl.etapa = 'CONVERTIDO' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2) >= st.conversion_rate_min THEN 'Adequado'
        ELSE 'Abaixo'
    END as performance_status
FROM public.bitrix_leads bl
LEFT JOIN public.scouter_profiles sp ON sp.scouter_name = bl.primeiro_nome
LEFT JOIN public.scouter_tiers st ON st.id = sp.current_tier_id
WHERE bl.data_de_criacao_da_ficha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'
AND bl.primeiro_nome IS NOT NULL
GROUP BY 
    DATE_TRUNC('week', bl.data_de_criacao_da_ficha),
    bl.primeiro_nome,
    st.tier_name,
    st.conversion_rate_min,
    st.conversion_rate_max
ORDER BY semana DESC, scouter;

-- Create scouter projection view with weekly series (Sem+1 to Sem+8)
CREATE OR REPLACE VIEW public.vw_projecao_scouter AS
WITH weekly_series AS (
    SELECT 
        generate_series(1, 8) as semana_futura,
        sp.scouter_name,
        sp.weekly_goal,
        sp.fichas_value,
        st.conversion_rate_min,
        st.conversion_rate_max,
        st.bonus_multiplier,
        st.tier_name
    FROM public.scouter_profiles sp
    LEFT JOIN public.scouter_tiers st ON st.id = sp.current_tier_id
    WHERE sp.active = true
),
historical_performance AS (
    SELECT 
        bl.primeiro_nome as scouter,
        AVG(weekly_stats.fichas_count) as avg_fichas_per_week,
        AVG(weekly_stats.conversion_rate) as avg_conversion_rate
    FROM public.bitrix_leads bl
    JOIN (
        SELECT 
            bl2.primeiro_nome,
            DATE_TRUNC('week', bl2.data_de_criacao_da_ficha) as week,
            COUNT(*) as fichas_count,
            COALESCE(
                ROUND((COUNT(CASE WHEN bl2.etapa = 'CONVERTIDO' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2),
                0
            ) as conversion_rate
        FROM public.bitrix_leads bl2
        WHERE bl2.data_de_criacao_da_ficha >= CURRENT_DATE - INTERVAL '8 weeks'
        GROUP BY bl2.primeiro_nome, DATE_TRUNC('week', bl2.data_de_criacao_da_ficha)
    ) weekly_stats ON weekly_stats.primeiro_nome = bl.primeiro_nome
    WHERE bl.primeiro_nome IS NOT NULL
    GROUP BY bl.primeiro_nome
)
SELECT 
    ws.scouter_name,
    ws.semana_futura,
    'Sem+' || ws.semana_futura as semana_label,
    ws.weekly_goal,
    ws.tier_name,
    
    -- Conservative scenario (10% decay per week, lower conversion rate)
    ROUND(
        (ws.weekly_goal * POWER(0.90, ws.semana_futura - 1)) *
        (ws.conversion_rate_min / 100.0) * 
        ws.fichas_value * 
        ws.bonus_multiplier
    , 2) as projecao_conservadora,
    
    -- Probable scenario (5% decay per week, average conversion rate)
    ROUND(
        (ws.weekly_goal * POWER(0.95, ws.semana_futura - 1)) *
        ((ws.conversion_rate_min + ws.conversion_rate_max) / 200.0) * 
        ws.fichas_value * 
        ws.bonus_multiplier
    , 2) as projecao_provavel,
    
    -- Aggressive scenario (no decay, higher conversion rate)
    ROUND(
        ws.weekly_goal *
        (ws.conversion_rate_max / 100.0) * 
        ws.fichas_value * 
        ws.bonus_multiplier
    , 2) as projecao_agressiva,
    
    -- Historical performance based projection
    CASE 
        WHEN hp.avg_fichas_per_week IS NOT NULL THEN
            ROUND(
                (hp.avg_fichas_per_week * POWER(0.97, ws.semana_futura - 1)) *
                (COALESCE(hp.avg_conversion_rate, (ws.conversion_rate_min + ws.conversion_rate_max) / 2) / 100.0) * 
                ws.fichas_value * 
                ws.bonus_multiplier
            , 2)
        ELSE ws.weekly_goal * ws.fichas_value * (ws.conversion_rate_min / 100.0)
    END as projecao_historica
    
FROM weekly_series ws
LEFT JOIN historical_performance hp ON hp.scouter = ws.scouter_name
ORDER BY ws.scouter_name, ws.semana_futura;

-- Create indexes for better performance
CREATE INDEX idx_scouter_profiles_scouter_name ON public.scouter_profiles(scouter_name);
CREATE INDEX idx_scouter_profiles_tier_id ON public.scouter_profiles(current_tier_id);
CREATE INDEX idx_scouter_tiers_order ON public.scouter_tiers(tier_order);

-- Create trigger for scouter_profiles timestamps
CREATE TRIGGER update_scouter_profiles_updated_at
    BEFORE UPDATE ON public.scouter_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scouter_tiers_updated_at
    BEFORE UPDATE ON public.scouter_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();