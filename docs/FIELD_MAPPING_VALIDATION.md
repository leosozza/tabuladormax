# Field Mapping Validation & Health Check

**Data:** 2025-01-20  
**Objetivo:** Garantir consistência entre as 4 tabelas de mapeamento do sistema

## Visão Geral

O TabuladorMax usa **4 tabelas** diferentes para mapeamentos de campos:

1. `bitrix_field_mappings` - Histórico/Documentação
2. `unified_field_config` - Webhook entrada (Bitrix → Supabase)
3. `field_mappings` - UI/Display (listas de leads)
4. `resync_field_mappings` - Resincronização (jobs de resync)

**CRÍTICO:** Todas devem estar alinhadas. Divergências causam:
- ❌ Dados salvos incorretamente
- ❌ UI mostrando campos errados
- ❌ Resync falhando ou ignorando leads
- ❌ Inconsistências entre webhook e resync

## Queries de Validação

### 1. Duplicatas em unified_field_config

```sql
-- ✅ Deve retornar 0 linhas
SELECT 
  supabase_field,
  COUNT(*) as active_mappings,
  array_agg(
    json_build_object(
      'bitrix_field', bitrix_field,
      'priority', sync_priority,
      'active', sync_active
    ) ORDER BY sync_priority DESC
  ) as mappings
FROM unified_field_config
WHERE sync_active = true
GROUP BY supabase_field
HAVING COUNT(*) > 1;
```

**Se retornar linhas:** Há múltiplos campos Bitrix ativos para o mesmo campo Supabase. **AÇÃO:** Desativar duplicatas mantendo apenas o de maior prioridade.

---

### 2. Duplicatas em resync_field_mappings

```sql
-- ✅ Deve retornar 0 linhas por mapping_name
SELECT 
  mapping_name,
  leads_column,
  COUNT(*) as active_mappings,
  array_agg(
    json_build_object(
      'bitrix_field', bitrix_field,
      'priority', priority,
      'transform', transform_function
    ) ORDER BY priority DESC
  ) as mappings
FROM resync_field_mappings
WHERE active = true
GROUP BY mapping_name, leads_column
HAVING COUNT(*) > 1;
```

**Se retornar linhas:** Job de resync tem múltiplos mapeamentos para a mesma coluna. **AÇÃO:** Manter apenas um mapeamento por coluna.

---

### 3. Alinhamento unified_field_config ↔ field_mappings

```sql
-- Verifica se campos sync_active têm correspondência na UI
SELECT 
  u.supabase_field,
  u.bitrix_field as webhook_bitrix_field,
  u.sync_priority as webhook_priority,
  f.bitrix_field as ui_bitrix_field,
  f.priority as ui_priority,
  f.default_visible as ui_visible,
  CASE 
    WHEN u.bitrix_field = f.bitrix_field OR f.bitrix_field IS NULL THEN '✅ OK'
    WHEN u.bitrix_field IS NULL AND f.bitrix_field IS NOT NULL THEN '⚠️  UI-only field'
    ELSE '❌ DIVERGENTE'
  END as status,
  CASE 
    WHEN u.bitrix_field != f.bitrix_field THEN 
      'Webhook usa "' || u.bitrix_field || '" mas UI usa "' || COALESCE(f.bitrix_field, 'NULL') || '"'
    ELSE NULL
  END as problema
FROM unified_field_config u
FULL OUTER JOIN field_mappings f ON u.supabase_field = f.supabase_field
WHERE u.sync_active = true OR f.active = true
ORDER BY status DESC, u.supabase_field;
```

**Interpretação:**
- ✅ **OK**: Campos alinhados
- ⚠️ **UI-only**: Campo só aparece na UI (comum para campos calculados como `commercial_projects.name`)
- ❌ **DIVERGENTE**: Webhook e UI usam campos Bitrix diferentes - **REQUER CORREÇÃO IMEDIATA**

---

### 4. Campos Órfãos (em uso mas sem mapeamento)

```sql
-- Verifica se há campos em use na UI sem mapeamento ativo
SELECT DISTINCT
  column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM unified_field_config 
      WHERE supabase_field = column_name AND sync_active = true
    ) THEN '✅ Tem em unified_field_config'
    ELSE '❌ ÓRFÃO - sem mapeamento webhook'
  END as webhook_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM field_mappings 
      WHERE supabase_field = column_name AND active = true
    ) THEN '✅ Tem em field_mappings'
    ELSE '⚠️  Sem config de UI'
  END as ui_status
FROM information_schema.columns
WHERE table_name = 'leads' 
  AND table_schema = 'public'
  AND column_name NOT IN ('id', 'raw', 'created_at', 'updated_at', 'last_sync_at', 'geocoded_at')
ORDER BY webhook_status DESC, column_name;
```

**AÇÃO:** Campos marcados como "ÓRFÃO" nunca serão preenchidos via webhook. Adicionar mapeamento ou marcar como não-sincronizado.

---

### 5. Health Score Geral

```sql
-- Score de saúde geral do sistema de mapeamentos
WITH 
duplicates_unified AS (
  SELECT COUNT(*) as qty
  FROM (
    SELECT supabase_field
    FROM unified_field_config
    WHERE sync_active = true
    GROUP BY supabase_field
    HAVING COUNT(*) > 1
  ) d
),
duplicates_resync AS (
  SELECT COUNT(*) as qty
  FROM (
    SELECT mapping_name, leads_column
    FROM resync_field_mappings
    WHERE active = true AND mapping_name = 'Mapeamento Padrão Bitrix'
    GROUP BY mapping_name, leads_column
    HAVING COUNT(*) > 1
  ) d
),
divergences AS (
  SELECT COUNT(*) as qty
  FROM unified_field_config u
  JOIN field_mappings f ON u.supabase_field = f.supabase_field
  WHERE u.sync_active = true 
    AND f.active = true
    AND u.bitrix_field != f.bitrix_field
    AND f.bitrix_field IS NOT NULL
),
total_active AS (
  SELECT COUNT(*) as qty FROM unified_field_config WHERE sync_active = true
)
SELECT 
  (SELECT qty FROM duplicates_unified) as duplicatas_webhook,
  (SELECT qty FROM duplicates_resync) as duplicatas_resync,
  (SELECT qty FROM divergences) as divergencias_webhook_ui,
  (SELECT qty FROM total_active) as total_campos_ativos,
  CASE 
    WHEN (SELECT qty FROM duplicates_unified) = 0 
     AND (SELECT qty FROM duplicates_resync) = 0
     AND (SELECT qty FROM divergences) = 0 THEN '✅ SISTEMA SAUDÁVEL'
    WHEN (SELECT qty FROM duplicates_unified) > 0 
      OR (SELECT qty FROM duplicates_resync) > 0 THEN '🔴 CRÍTICO - Duplicatas encontradas'
    WHEN (SELECT qty FROM divergences) > 0 THEN '🟡 ATENÇÃO - Divergências entre webhook e UI'
    ELSE '🟢 OK'
  END as health_status;
```

**Metas:**
- 🟢 **0 duplicatas** em todas as tabelas
- 🟢 **0 divergências** entre webhook e UI
- 🟢 **Health Score: SISTEMA SAUDÁVEL**

---

## Procedimentos de Correção

### Corrigir Duplicata em unified_field_config

```sql
-- 1. Identificar duplicata
SELECT * FROM unified_field_config 
WHERE supabase_field = 'CAMPO_PROBLEMA' AND sync_active = true
ORDER BY sync_priority DESC;

-- 2. Desativar mapeamento de menor prioridade
UPDATE unified_field_config 
SET sync_active = false, 
    notes = 'Desativado - duplicata (correção ' || CURRENT_DATE || ')'
WHERE id = 'ID_DO_MAPEAMENTO_ANTIGO';

-- 3. Validar
SELECT * FROM unified_field_config 
WHERE supabase_field = 'CAMPO_PROBLEMA' AND sync_active = true;
-- Deve retornar apenas 1 linha
```

---

### Corrigir Divergência webhook ↔ UI

```sql
-- Cenário: webhook usa UF_CRM_AAA mas UI usa UF_CRM_BBB

-- 1. Verificar qual está correto (consultar BITRIX_FIELD_MAPPINGS_FINAL.md)

-- 2. Atualizar field_mappings para bater com unified_field_config
UPDATE field_mappings
SET bitrix_field = 'UF_CRM_AAA',  -- campo correto do webhook
    notes = 'Alinhado com unified_field_config (' || CURRENT_DATE || ')'
WHERE supabase_field = 'CAMPO_PROBLEMA';

-- 3. Validar alinhamento
SELECT 
  u.supabase_field,
  u.bitrix_field as webhook,
  f.bitrix_field as ui,
  u.bitrix_field = f.bitrix_field as aligned
FROM unified_field_config u
JOIN field_mappings f ON u.supabase_field = f.supabase_field
WHERE u.supabase_field = 'CAMPO_PROBLEMA';
```

---

### Recriar resync_field_mappings do Zero

```sql
-- 1. Desativar mapeamento atual
UPDATE resync_field_mappings 
SET active = false, 
    notes = 'Desativado para recriação limpa (' || CURRENT_DATE || ')'
WHERE mapping_name = 'Mapeamento Padrão Bitrix';

-- 2. Criar novo baseado em unified_field_config
INSERT INTO resync_field_mappings (
  mapping_name,
  bitrix_field,
  leads_column,
  transform_function,
  skip_if_null,
  priority,
  active,
  notes
)
SELECT 
  'Mapeamento Padrão Bitrix' as mapping_name,
  bitrix_field,
  supabase_field as leads_column,
  transform_function,
  true as skip_if_null,
  sync_priority as priority,
  true as active,
  'Auto-gerado de unified_field_config (' || CURRENT_DATE || ')' as notes
FROM unified_field_config
WHERE sync_active = true
  AND bitrix_field IS NOT NULL
  AND bitrix_field NOT LIKE 'PARENT_ID_%'  -- SPA fields não vão pro resync direto
ORDER BY sync_priority;

-- 3. Validar
SELECT COUNT(*) as total_mappings 
FROM resync_field_mappings 
WHERE active = true AND mapping_name = 'Mapeamento Padrão Bitrix';
```

---

## Testes de Integração

### Teste 1: Webhook Salva Valores Corretos

```sql
-- 1. Antes do teste: anotar um lead_id de teste
-- 2. Atualizar o lead no Bitrix (mudar etapa_fluxo, ficha_confirmada, etc)
-- 3. Aguardar webhook processar
-- 4. Validar:

SELECT 
  id,
  name,
  etapa_fluxo,        -- Deve ter valor de UF_CRM_1742391534
  etapa_funil,        -- Deve ter valor de UF_CRM_1742391480  
  ficha_confirmada,   -- Deve ter valor de UF_CRM_1729776113
  fonte,              -- Deve ter valor de SOURCE_ID
  local_abordagem,    -- Deve ter valor de ADDRESS_CITY
  telefone_casa,      -- Deve ter valor de UF_CRM_1762868715
  last_sync_at
FROM leads
WHERE id = LEAD_ID_TESTE
ORDER BY last_sync_at DESC LIMIT 1;
```

**Critério de sucesso:** Todos os campos têm valores e `last_sync_at` foi atualizado.

---

### Teste 2: Resync Atualiza Campos Corretos

```sql
-- 1. Criar job de resync pequeno (10 leads)
-- 2. Monitorar logs da edge function
-- 3. Após conclusão, validar:

SELECT 
  COUNT(*) as leads_atualizados
FROM leads
WHERE last_sync_at > NOW() - INTERVAL '5 minutes'
  AND id IN (SELECT id FROM leads ORDER BY id DESC LIMIT 10);

-- 4. Verificar detalhes de um lead
SELECT 
  id, name, etapa_fluxo, ficha_confirmada, last_sync_at,
  raw->'UF_CRM_1742391534' as bitrix_etapa_fluxo_raw,
  raw->'UF_CRM_1729776113' as bitrix_ficha_confirmada_raw
FROM leads
WHERE id = LEAD_ID_TESTE;
```

**Critério de sucesso:** 
- Leads foram atualizados (`last_sync_at` recente)
- Valores em `leads` batem com valores em `raw`

---

### Teste 3: UI Mostra Colunas Corretas

**Procedimento:**
1. Acessar `/gestao/leads`
2. Abrir seletor de colunas
3. Verificar que **não há** coluna "projetos" (campo fantasma)
4. Verificar que **há** coluna "Projeto Comercial" (`commercial_projects.name`)
5. Selecionar campos: `etapa_fluxo`, `ficha_confirmada`, `fonte`
6. Validar que valores exibidos batem com banco:

```sql
SELECT 
  name,
  etapa_fluxo,
  ficha_confirmada,
  fonte,
  commercial_projects.name as projeto_comercial
FROM leads
LEFT JOIN commercial_projects ON leads.commercial_project_id = commercial_projects.id
ORDER BY id DESC
LIMIT 20;
```

**Critério de sucesso:** UI exibe exatamente os mesmos valores do SELECT.

---

## Rotina de Manutenção

### Diária (Automatizada)
- [ ] Executar query **Health Score Geral**
- [ ] Alertar se score != "SISTEMA SAUDÁVEL"

### Semanal (Manual)
- [ ] Executar query **Alinhamento webhook ↔ UI**
- [ ] Revisar campos com status ❌ ou ⚠️

### Mensal (Manual)
- [ ] Executar **Teste 1: Webhook**
- [ ] Executar **Teste 2: Resync**
- [ ] Executar **Teste 3: UI**
- [ ] Revisar `docs/BITRIX_FIELD_MAPPINGS_FINAL.md`

### Após Qualquer Mudança em Mapeamentos
- [ ] Executar TODAS as queries de validação
- [ ] Executar os 3 testes de integração
- [ ] Atualizar documentação
- [ ] Commit com mensagem descritiva

---

## Ferramentas de Diagnóstico

### Edge Function: mapping-diagnostics

**TODO:** Criar edge function que:
1. Executa todas as queries de validação
2. Retorna JSON com resultados
3. Pode ser chamada por admin via UI

```typescript
// supabase/functions/mapping-diagnostics/index.ts
// Retorna:
{
  "health_score": "SISTEMA SAUDÁVEL",
  "duplicates_webhook": 0,
  "duplicates_resync": 0,
  "divergences": 0,
  "total_active_fields": 45,
  "last_check": "2025-01-20T10:30:00Z",
  "issues": []
}
```

---

## Troubleshooting

### Problema: "Leads sendo ignorados no resync"

**Causa:** `resync_field_mappings` não tem mapeamentos ativos

**Diagnóstico:**
```sql
SELECT COUNT(*) FROM resync_field_mappings 
WHERE active = true AND mapping_name = 'Mapeamento Padrão Bitrix';
```

**Solução:** Recriar mapeamentos (ver seção "Recriar resync_field_mappings")

---

### Problema: "UI mostra coluna 'projetos' que não existe"

**Causa:** `ALL_LEAD_FIELDS` em `leadFields.ts` contém campo inexistente

**Diagnóstico:** Verificar `src/config/leadFields.ts` linha ~122

**Solução:** Remover entrada com `key: 'projetos'`

---

### Problema: "Webhook salva valores em campos errados"

**Causa:** `unified_field_config` tem duplicatas ou campos incorretos

**Diagnóstico:** Executar query "Duplicatas em unified_field_config"

**Solução:** Desativar duplicatas, manter apenas campos oficiais de `BITRIX_FIELD_MAPPINGS_FINAL.md`

---

## Referências

- `docs/BITRIX_FIELD_MAPPINGS_FINAL.md` - Fonte de verdade oficial
- `docs/FIELD_MAPPING_SYSTEM.md` - Arquitetura do sistema
- `supabase/functions/bitrix-webhook/index.ts` - Implementação webhook
- `supabase/functions/bitrix-resync-leads/index.ts` - Implementação resync
