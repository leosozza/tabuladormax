-- Fix security definer view issues by removing and recreating views with proper security context

-- Drop and recreate views with correct permissions
DROP VIEW IF EXISTS public.vw_funil_semana;
DROP VIEW IF EXISTS public.vw_quality_semana;  
DROP VIEW IF EXISTS public.vw_projecao_scouter;

-- Create weekly funnel view (no SECURITY DEFINER)
CREATE VIEW public.vw_funil_semana AS
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

-- Create weekly quality view (no SECURITY DEFINER)
CREATE VIEW public.vw_quality_semana AS
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

-- Create scouter projection view (no SECURITY DEFINER)
CREATE VIEW public.vw_projecao_scouter AS
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