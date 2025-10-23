-- 1.1 Tabela tenant (se necessário)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS tenant (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- 1.2 Scouters (padrão)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS dim_scouter (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    nome text NOT NULL,
    bitrix_user_id text,
    classificacao text NOT NULL DEFAULT 'Scouter Iniciante',
    regional text,
    data_inicio date,
    meta_fichas_semana int NOT NULL DEFAULT 40,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Add foreign key constraint if tenant table exists and constraint doesn't exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant') THEN
    BEGIN
      ALTER TABLE dim_scouter ADD CONSTRAINT fk_dim_scouter_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 1.3 Leads/Fichas normalizada
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS ficha (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    scouter_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    kpi_contato boolean NOT NULL DEFAULT false,
    kpi_agendado boolean NOT NULL DEFAULT false,
    kpi_presenca_confirmada boolean NOT NULL DEFAULT false,
    kpi_concluido_positivo boolean NOT NULL DEFAULT false,
    tem_foto boolean NOT NULL DEFAULT false,
    marcado_interesse boolean NOT NULL DEFAULT false,
    projeto text,
    valor_ficha_override numeric(12,2)
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Add foreign key constraints
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant') THEN
    BEGIN
      ALTER TABLE ficha ADD CONSTRAINT fk_ficha_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dim_scouter') THEN
    BEGIN
      ALTER TABLE ficha ADD CONSTRAINT fk_ficha_scouter 
        FOREIGN KEY (scouter_id) REFERENCES dim_scouter(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ficha_scouter ON ficha(scouter_id);
CREATE INDEX IF NOT EXISTS idx_ficha_created ON ficha(created_at);

-- 1.4 Tiers
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS scouter_config_tier (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    nome_tier text NOT NULL,
    ajuda_custo_fixa numeric(12,2) NOT NULL DEFAULT 0,
    valor_por_ficha_base numeric(12,2) NOT NULL DEFAULT 10,
    w_foto numeric(5,4) NOT NULL DEFAULT 0.25,
    w_interesse numeric(5,4) NOT NULL DEFAULT 0.25,
    w_agendado numeric(5,4) NOT NULL DEFAULT 0.25,
    w_comparecido numeric(5,4) NOT NULL DEFAULT 0.25,
    meta_fichas_semana int NOT NULL DEFAULT 40,
    falta_tolerada_mes int NOT NULL DEFAULT 2,
    bonus_quality_threshold int NOT NULL DEFAULT 70,
    bonus_quality_valor numeric(5,4) NOT NULL DEFAULT 0.05,
    penalidade_falta_valor numeric(5,4) NOT NULL DEFAULT 0.05,
    penalidade_constancia_valor numeric(5,4) NOT NULL DEFAULT 0.05,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, nome_tier)
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Add foreign key constraint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant') THEN
    BEGIN
      ALTER TABLE scouter_config_tier ADD CONSTRAINT fk_scouter_config_tier_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 1.5 Fechamento semanal (snapshot)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS fechamento_semana (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    scouter_id uuid NOT NULL,
    semana_iso text NOT NULL, -- IYYY-IW
    total_fichas int NOT NULL DEFAULT 0,
    kpi1 numeric(6,4) NOT NULL DEFAULT 0,
    kpi2 numeric(6,4) NOT NULL DEFAULT 0,
    kpi3 numeric(6,4) NOT NULL DEFAULT 0,
    kpi4 numeric(6,4) NOT NULL DEFAULT 0,
    pct_foto numeric(6,4) NOT NULL DEFAULT 0,
    pct_interesse numeric(6,4) NOT NULL DEFAULT 0,
    faltas int NOT NULL DEFAULT 0,
    constancia numeric(6,4) NOT NULL DEFAULT 0,
    valor_real numeric(12,2)
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Add foreign key constraints
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant') THEN
    BEGIN
      ALTER TABLE fechamento_semana ADD CONSTRAINT fk_fechamento_semana_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dim_scouter') THEN
    BEGIN
      ALTER TABLE fechamento_semana ADD CONSTRAINT fk_fechamento_semana_scouter 
        FOREIGN KEY (scouter_id) REFERENCES dim_scouter(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- Insert default tenant
INSERT INTO tenant (id, name)
VALUES ('00000000-0000-0000-0000-000000000001','default')
ON CONFLICT (id) DO NOTHING;

-- Insert tier configurations
INSERT INTO scouter_config_tier (tenant_id, nome_tier, ajuda_custo_fixa, valor_por_ficha_base,
 w_foto,w_interesse,w_agendado,w_comparecido, meta_fichas_semana, falta_tolerada_mes,
 bonus_quality_threshold, bonus_quality_valor, penalidade_falta_valor, penalidade_constancia_valor)
VALUES
('00000000-0000-0000-0000-000000000001','Scouter Iniciante',150,10, 0.30,0.30,0.25,0.15,40,3,65,0.03,0.03,0.03),
('00000000-0000-0000-0000-000000000001','Scouter Pleno',    200,12, 0.25,0.25,0.25,0.25,60,2,70,0.04,0.04,0.04),
('00000000-0000-0000-0000-000000000001','Scouter Premium',  300,18, 0.20,0.25,0.25,0.30,80,1,75,0.05,0.05,0.05),
('00000000-0000-0000-0000-000000000001','Scouter Coach Bronze',350,20, 0.18,0.22,0.25,0.35,90,1,78,0.06,0.05,0.05),
('00000000-0000-0000-0000-000000000001','Scouter Coach Prata', 400,22, 0.15,0.20,0.25,0.40,95,1,80,0.07,0.05,0.05),
('00000000-0000-0000-0000-000000000001','Scouter Coach Ouro',  500,25, 0.12,0.18,0.25,0.45,100,1,82,0.08,0.05,0.05),
('00000000-0000-0000-0000-000000000001','Gestor Operacional',  600, 8, 0.15,0.20,0.30,0.35,60,2,75,0.05,0.05,0.05),
('00000000-0000-0000-0000-000000000001','Gestor Administrativo',700, 6, 0.10,0.20,0.30,0.40,40,2,75,0.05,0.05,0.05)
ON CONFLICT (tenant_id, nome_tier) DO NOTHING;

-- 1.7 Views normalizadoras (funcionam com Bitrix OU ficha)
-- A) vw_leads_unificada: retorna linhas de leads, vindas de ficha OU de bitrix_leads (se existir)
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
  (bl.etapa IN ('CONTATO','EM_CONTATO')) AS kpi_contato,
  (bl.etapa = 'AGENDADO') AS kpi_agendado,
  (bl.etapa = 'PRESENCA_CONFIRMADA') AS kpi_presenca_confirmada,
  (bl.etapa = 'CONVERTIDO') AS kpi_concluido_positivo,
  (bl.foto_do_modelo IS NOT NULL AND bl.foto_do_modelo != '') AS tem_foto,
  (bl.local_da_abordagem IS NOT NULL) AS marcado_interesse
FROM bitrix_leads bl
LEFT JOIN dim_scouter ds ON ds.nome = bl.gestao_de_scouter
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

-- D) Projeção simplificada para compatibilidade
CREATE OR REPLACE VIEW vw_projecao_scouter AS
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
  ds.nome AS scouter_name,
  1 AS semana_futura,
  'Sem+1' AS semana_label,
  ds.meta_fichas_semana AS weekly_goal,
  sct.nome_tier AS tier_name,
  -- Projeção conservadora (80% da meta)
  ROUND((ds.meta_fichas_semana * 0.8 * sct.valor_por_ficha_base)::numeric, 2) AS projecao_conservadora,
  -- Projeção provável (90% da meta)
  ROUND((ds.meta_fichas_semana * 0.9 * sct.valor_por_ficha_base)::numeric, 2) AS projecao_provavel,
  -- Projeção agressiva (110% da meta)
  ROUND((ds.meta_fichas_semana * 1.1 * sct.valor_por_ficha_base)::numeric, 2) AS projecao_agressiva,
  -- Projeção histórica (média da meta)
  ROUND((ds.meta_fichas_semana * sct.valor_por_ficha_base)::numeric, 2) AS projecao_historica
FROM dim_scouter ds
LEFT JOIN scouter_config_tier sct ON sct.nome_tier = ds.classificacao AND sct.tenant_id = ds.tenant_id
WHERE ds.ativo = true
UNION ALL
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid as tenant_id,
  ds.nome AS scouter_name,
  2 AS semana_futura,
  'Sem+2' AS semana_label,
  ds.meta_fichas_semana AS weekly_goal,
  sct.nome_tier AS tier_name,
  ROUND((ds.meta_fichas_semana * 0.78 * sct.valor_por_ficha_base)::numeric, 2) AS projecao_conservadora,
  ROUND((ds.meta_fichas_semana * 0.88 * sct.valor_por_ficha_base)::numeric, 2) AS projecao_provavel,
  ROUND((ds.meta_fichas_semana * 1.08 * sct.valor_por_ficha_base)::numeric, 2) AS projecao_agressiva,
  ROUND((ds.meta_fichas_semana * 0.95 * sct.valor_por_ficha_base)::numeric, 2) AS projecao_historica
FROM dim_scouter ds
LEFT JOIN scouter_config_tier sct ON sct.nome_tier = ds.classificacao AND sct.tenant_id = ds.tenant_id
WHERE ds.ativo = true;