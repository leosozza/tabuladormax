-- Fix the views with correct column references
CREATE OR REPLACE VIEW vw_leads_unificada AS
SELECT f.tenant_id, f.scouter_id, f.created_at, f.projeto,
       f.kpi_contato, f.kpi_agendado, f.kpi_presenca_confirmada, f.kpi_concluido_positivo,
       f.tem_foto, f.marcado_interesse
FROM ficha f
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ficha')

UNION ALL

SELECT
  '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
  COALESCE(ds.id, NULL) AS scouter_id,
  bl.data_de_criacao_da_ficha AS created_at,
  bl.projetos_cormeciais AS projeto,
  (bl.etapa IN ('Contato','Em contato')) AS kpi_contato,
  (bl.etapa = 'Agendado') AS kpi_agendado,
  (bl.etapa = 'Presença confirmada') AS kpi_presenca_confirmada,
  (bl.etapa = 'Convertido') AS kpi_concluido_positivo,
  (bl.foto_do_modelo IS NOT NULL AND bl.foto_do_modelo != '') AS tem_foto,
  (bl.local_da_abordagem IS NOT NULL) AS marcado_interesse
FROM bitrix_leads bl
LEFT JOIN dim_scouter ds ON ds.nome = bl.primeiro_nome -- Using primeiro_nome as closest match
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables t
  WHERE t.table_schema='public' AND t.table_name='bitrix_leads'
);

-- B) Funil semanal
CREATE OR REPLACE VIEW vw_funil_semana AS
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
  l.scouter_id,
  to_char(date_trunc('week', l.created_at), 'IYYY-IW') AS semana_iso,
  date_trunc('week', l.created_at) AS semana,
  count(*)::bigint AS total_fichas,
  count(*) filter (where l.kpi_concluido_positivo)::bigint AS convertidos,  
  CASE WHEN count(*) > 0 THEN 
    (count(*) filter (where l.kpi_concluido_positivo)::numeric / count(*)::numeric * 100)
  ELSE 0 END AS taxa_conversao,
  CASE WHEN count(*) filter (where l.kpi_concluido_positivo) > 0 THEN
    (sum(CASE WHEN l.kpi_concluido_positivo THEN 10.0 ELSE 0 END) / count(*) filter (where l.kpi_concluido_positivo))
  ELSE 0 END AS valor_medio_ficha
FROM vw_leads_unificada l
WHERE l.created_at IS NOT NULL
GROUP BY 1,2,3,4;

-- C) Quality semanal
CREATE OR REPLACE VIEW vw_quality_semana AS
SELECT
  fs.tenant_id,
  ds.nome AS scouter,
  fs.semana,
  fs.total_fichas,
  fs.convertidos,
  CASE WHEN fs.total_fichas > 0 THEN 
    (fs.convertidos::numeric / fs.total_fichas::numeric * 100)
  ELSE 0 END AS taxa_conversao_individual,
  sct.bonus_quality_threshold::numeric AS conversion_rate_min,
  100.0 AS conversion_rate_max,
  sct.nome_tier AS tier_name,
  CASE 
    WHEN fs.total_fichas = 0 THEN 'Sem Dados'
    WHEN (fs.convertidos::numeric / fs.total_fichas::numeric * 100) >= sct.bonus_quality_threshold THEN 'Acima da Meta'
    WHEN (fs.convertidos::numeric / fs.total_fichas::numeric * 100) >= (sct.bonus_quality_threshold * 0.8) THEN 'Próximo da Meta'
    ELSE 'Abaixo da Meta'
  END AS performance_status
FROM vw_funil_semana fs
LEFT JOIN dim_scouter ds ON ds.id = fs.scouter_id
LEFT JOIN scouter_config_tier sct ON sct.nome_tier = ds.classificacao AND sct.tenant_id = fs.tenant_id;

-- D) Projeção multi-semana com sample data
CREATE OR REPLACE VIEW vw_projecao_scouter AS
WITH weeks AS (
  SELECT generate_series(1, 8) AS semana_futura
), sample_scouters AS (
  -- Create sample scouters if none exist in dim_scouter
  SELECT 
    gen_random_uuid() as id,
    '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
    'Ana Silva' as nome,
    'Scouter Pleno' as classificacao,
    50 as meta_fichas_semana,
    true as ativo
  UNION ALL
  SELECT 
    gen_random_uuid() as id,
    '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
    'Carlos Santos' as nome,
    'Scouter Iniciante' as classificacao,
    40 as meta_fichas_semana,
    true as ativo
  UNION ALL
  SELECT 
    gen_random_uuid() as id,
    '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
    'Maria Oliveira' as nome,
    'Scouter Premium' as classificacao,
    60 as meta_fichas_semana,
    true as ativo
), all_scouters AS (
  SELECT id, tenant_id, nome, classificacao, meta_fichas_semana, ativo FROM dim_scouter WHERE ativo = true
  UNION ALL
  SELECT id, tenant_id, nome, classificacao, meta_fichas_semana, ativo FROM sample_scouters
  WHERE NOT EXISTS (SELECT 1 FROM dim_scouter WHERE ativo = true)
)
SELECT 
  s.tenant_id,
  s.nome AS scouter_name,
  w.semana_futura,
  CASE w.semana_futura
    WHEN 1 THEN 'Sem+1'
    WHEN 2 THEN 'Sem+2'
    WHEN 3 THEN 'Sem+3'
    WHEN 4 THEN 'Sem+4'
    WHEN 5 THEN 'Sem+5'
    WHEN 6 THEN 'Sem+6'
    WHEN 7 THEN 'Sem+7'
    WHEN 8 THEN 'Sem+8'
  END AS semana_label,
  s.meta_fichas_semana AS weekly_goal,
  sct.nome_tier AS tier_name,
  -- Projeção conservadora (decay de 2% por semana)
  ROUND((s.meta_fichas_semana * 0.8 * POWER(0.98, w.semana_futura-1) * sct.valor_por_ficha_base)::numeric, 2) AS projecao_conservadora,
  -- Projeção provável (decay de 1% por semana)
  ROUND((s.meta_fichas_semana * 0.9 * POWER(0.99, w.semana_futura-1) * sct.valor_por_ficha_base)::numeric, 2) AS projecao_provavel,
  -- Projeção agressiva (sem decay significativo)
  ROUND((s.meta_fichas_semana * 1.1 * POWER(0.995, w.semana_futura-1) * sct.valor_por_ficha_base)::numeric, 2) AS projecao_agressiva,
  -- Projeção histórica (decay médio de 1.5% por semana)
  ROUND((s.meta_fichas_semana * POWER(0.985, w.semana_futura-1) * sct.valor_por_ficha_base)::numeric, 2) AS projecao_historica
FROM all_scouters s
CROSS JOIN weeks w
LEFT JOIN scouter_config_tier sct ON sct.nome_tier = s.classificacao AND sct.tenant_id = s.tenant_id
WHERE s.ativo = true;