-- Insert sample scouter profiles to make the projection system work
INSERT INTO public.scouter_profiles (scouter_name, current_tier_id, fichas_value, weekly_goal, active) 
SELECT 
    scouter_name,
    tier_id,
    fichas_value,
    weekly_goal,
    true
FROM (
    VALUES 
    ('João Silva', (SELECT id FROM public.scouter_tiers WHERE tier_name = 'Junior'), 150.00, 25),
    ('Maria Santos', (SELECT id FROM public.scouter_tiers WHERE tier_name = 'Pleno'), 200.00, 40),
    ('Pedro Costa', (SELECT id FROM public.scouter_tiers WHERE tier_name = 'Senior'), 250.00, 55),
    ('Ana Oliveira', (SELECT id FROM public.scouter_tiers WHERE tier_name = 'Iniciante'), 100.00, 8),
    ('Carlos Ferreira', (SELECT id FROM public.scouter_tiers WHERE tier_name = 'Especialista'), 300.00, 75),
    ('Lucia Pereira', (SELECT id FROM public.scouter_tiers WHERE tier_name = 'Gestor'), 350.00, 95)
) AS sample_data(scouter_name, tier_id, fichas_value, weekly_goal)
ON CONFLICT (scouter_name) DO NOTHING;

-- Insert some sample leads to populate the projection views
INSERT INTO public.bitrix_leads (
    bitrix_id, 
    etapa, 
    data_de_criacao_da_ficha, 
    primeiro_nome,
    nome_do_modelo,
    telefone_de_trabalho
) 
SELECT 
    generate_series(1000, 1099) as bitrix_id,
    CASE WHEN random() > 0.7 THEN 'CONVERTIDO' ELSE 'EM_ANDAMENTO' END as etapa,
    (CURRENT_DATE - (random() * 60)::int) as data_de_criacao_da_ficha,
    (ARRAY['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Ferreira', 'Lucia Pereira'])[ceil(random() * 6)] as primeiro_nome,
    'Modelo ' || generate_series(1000, 1099) as nome_do_modelo,
    '11999' || lpad((random() * 999999)::int::text, 6, '0') as telefone_de_trabalho
ON CONFLICT (bitrix_id) DO NOTHING;