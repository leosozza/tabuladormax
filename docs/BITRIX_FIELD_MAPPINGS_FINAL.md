# Mapeamentos Oficiais Bitrix → TabuladorMax

**Última atualização:** 2025-01-20  
**Status:** ✅ Auditoria completa - Sem duplicatas

## Resumo

Este documento define os mapeamentos **oficiais e únicos** entre campos do Bitrix24 e campos da tabela `leads` no TabuladorMax. Após a auditoria completa de 2025-01-20, cada campo tem **apenas 1 mapeamento ativo** e todas as tabelas de configuração estão alinhadas.

## Arquitetura de Mapeamentos

### Tabelas de Mapeamento (Unificadas)

O sistema usa **4 tabelas** de mapeamento com propósitos distintos mas alinhados:

1. **`bitrix_field_mappings`** (Legado/Documentação)
   - Mapeamentos históricos e referência
   - Não usado diretamente pelas edge functions

2. **`unified_field_config`** (Entrada Webhook)
   - Usado por `bitrix-webhook` para sincronização Bitrix → Supabase
   - Campos com `sync_active = true` são aplicados

3. **`field_mappings`** (UI/Display)
   - Usado pela interface para exibir colunas nas listas de leads
   - Campos com `default_visible = true` aparecem por padrão

4. **`resync_field_mappings`** (Resincronização)
   - Usado por `bitrix-resync-leads` para jobs de resync
   - Permite criar perfis customizados de resync

**IMPORTANTE:** Todas as 4 tabelas devem estar **sincronizadas** com este documento. Qualquer divergência causa inconsistências nos dados.

## Campos Principais

| Campo Supabase | Campo Bitrix | Tipo | Prioridade | Transform | Notas |
|---|---|---|---|---|---|
| **name** | NAME | string | 0 | - | Primeiro nome do lead |
| **responsible** | ASSIGNED_BY_ID | integer | 1 | toString | ID do usuário responsável no Bitrix |
| **etapa** | STATUS_ID | string | 10 | - | Status/etapa do lead |
| **fonte** | SOURCE_ID | string | 60 | - | Origem/fonte do lead (campo padrão Bitrix) |
| **local_abordagem** | ADDRESS_CITY | string | 40 | - | Cidade do endereço (campo padrão Bitrix) |
| **address** | ADDRESS | string | 45 | - | Endereço completo |

## Campos com Transformação

Estes campos requerem transformação de dados durante a sincronização:

| Campo Supabase | Campo Bitrix | Transform Function | Descrição |
|---|---|---|---|
| **commercial_project_id** | UF_CRM_1741215746 | bitrixProjectCodeToUUID | Converte código do projeto (ex: "PIN") para UUID |
| **nome_modelo** | UF_CRM_LEAD_1732627097745 | - | Nome do modelo (campo UF) |
| **scouter** | UF_CRM_1742226427 | - | Scouter responsável |
| **criado** | DATE_CREATE | toDate | Data de criação |
| **date_modify** | DATE_MODIFY | toDate | Data de modificação |
| **valor_ficha** | UF_CRM_1729776004 | toNumber | Valor da ficha |
| **idade** | UF_CRM_1729776024 | toNumber | Idade do lead |

## Campos de Etapas/Funis (ATENÇÃO!)

**Campos oficiais ativos:**

| Campo Supabase | Campo Bitrix | Prioridade | Notas |
|---|---|---|---|
| **etapa_fluxo** | UF_CRM_1742391534 | 30 | Etapa do fluxo de trabalho ✅ |
| **etapa_funil** | UF_CRM_1742391480 | 30 | Etapa do funil de vendas ✅ |
| **gerenciamento_funil** | UF_CRM_1742391351 | 30 | Gerenciamento do funil ✅ |

**Campos desativados (duplicatas):**
- ❌ `etapa_fluxo` → `UF_CRM_1741961401` (antigo)
- ❌ `etapa_funil` → `UF_CRM_1744324211` (antigo)
- ❌ `gerenciamento_funil` → `UF_CRM_1744320647` (antigo)

## Campos de Confirmação

| Campo Supabase | Campo Bitrix | Prioridade | Transform | Notas |
|---|---|---|---|---|
| **ficha_confirmada** | UF_CRM_1729776113 | 50 | toBoolean | Status de confirmação da ficha ✅ |
| **presenca_confirmada** | UF_CRM_1729776132 | 50 | toBoolean | Confirmação de presença ✅ |

**Campos desativados:**
- ❌ `ficha_confirmada` → `UF_CRM_1737378043893` (antigo)
- ❌ `presenca_confirmada` → `UF_CRM_1729776110` (antigo)

## Campos de Contato

| Campo Supabase | Campo Bitrix | Prioridade | Notas |
|---|---|---|---|
| **telefone_casa** | UF_CRM_1762868715 | 80 | Telefone residencial ✅ |
| **telefone_trabalho** | UF_CRM_1729775915 | 80 | Telefone trabalho |
| **celular** | UF_CRM_1729775894 | 80 | Celular |

**Campos desativados:**
- ❌ `telefone_casa` → `PHONE` (muito genérico)
- ❌ `telefone_casa` → `UF_CRM_1729775837` (antigo)

## Campos SPA (Smart Process Automation)

Estes campos são preenchidos via resolução de entidades SPA (`bitrix_spa_entities`):

| Campo Supabase | Campo Bitrix PARENT_ID | Entity Type | Prioridade | Notas |
|---|---|---|---|---|
| **scouter** | PARENT_ID_1096 | 1096 | 90 | Scouter via SPA |
| **gestao_scouter** | PARENT_ID_1096 | 1096 | 90 | Mesmo que scouter |
| **telemarketing** | PARENT_ID_1144 | 1144 | 90 | Operador telemarketing via SPA |
| **op_telemarketing** | PARENT_ID_1144 | 1144 | 90 | Mesmo que telemarketing |
| **projeto_comercial** | PARENT_ID_1120 | 1120 | 90 | Projeto comercial via SPA |

**Como funciona:**
1. Webhook recebe `PARENT_ID_XXXX` com um `bitrixItemId`
2. Edge function consulta `bitrix_spa_entities` para obter o `title`
3. `title` é salvo no campo correspondente em `leads`

## Campos Desativados (Auditoria 2025-01-20)

### Duplicatas Removidas

| Campo | Bitrix Field Desativado | Motivo |
|---|---|---|
| telefone_casa | PHONE | Menos específico que UF_CRM_1762868715 |
| telefone_casa | UF_CRM_1729775837 | Campo antigo |
| etapa_fluxo | UF_CRM_1741961401 | Campo antigo |
| etapa_funil | UF_CRM_1744324211 | Campo antigo |
| ficha_confirmada | UF_CRM_1737378043893 | Campo antigo |
| fonte | UF_CRM_1729776032 | Campo customizado (SOURCE_ID é padrão) |
| gerenciamento_funil | UF_CRM_1744320647 | Campo antigo |
| local_abordagem | UF_CRM_1729775954 | Campo customizado (ADDRESS_CITY é padrão) |
| name | TITLE | Campo título genérico (NAME é específico) |
| presenca_confirmada | UF_CRM_1729776110 | Campo antigo |
| responsible | UF_CRM_1622827519 | Campo customizado (ASSIGNED_BY_ID é padrão) |

## Validação de Consistência

### Query para Verificar Duplicatas em unified_field_config

```sql
-- Deve retornar 0 linhas
SELECT 
  supabase_field,
  COUNT(*) as active_mappings,
  array_agg(bitrix_field ORDER BY sync_priority DESC) as bitrix_fields
FROM unified_field_config
WHERE sync_active = true
GROUP BY supabase_field
HAVING COUNT(*) > 1;
```

### Query para Verificar Duplicatas em resync_field_mappings

```sql
-- Deve retornar 0 linhas para cada mapping_name
SELECT 
  mapping_name,
  leads_column,
  COUNT(*) as active_mappings,
  array_agg(bitrix_field ORDER BY priority DESC) as bitrix_fields
FROM resync_field_mappings
WHERE active = true
GROUP BY mapping_name, leads_column
HAVING COUNT(*) > 1;
```

### Query para Verificar Alinhamento entre Tabelas

```sql
-- Comparar unified_field_config vs field_mappings
SELECT 
  u.supabase_field,
  u.bitrix_field as unified_bitrix,
  f.bitrix_field as field_mappings_bitrix,
  CASE 
    WHEN u.bitrix_field = f.bitrix_field THEN '✅ Alinhado'
    WHEN f.bitrix_field IS NULL THEN '⚠️  Não está em field_mappings'
    ELSE '❌ DIVERGENTE'
  END as status
FROM unified_field_config u
LEFT JOIN field_mappings f ON u.supabase_field = f.supabase_field
WHERE u.sync_active = true
ORDER BY status DESC, u.supabase_field;
```

## Sincronização

Os mapeamentos são utilizados em:

1. **Webhook Bitrix → Supabase** (`bitrix-webhook/index.ts`)
   - Usa `unified_field_config` com `sync_active = true`

2. **Sincronização Supabase → Bitrix** (`sync-to-bitrix/index.ts`)
   - Usa `unified_field_config` (direção reversa)

3. **Importação em lote** (`bitrix-import-batch/index.ts`)
   - Usa `unified_field_config`

4. **Resincronização** (`bitrix-resync-leads/index.ts`)
   - Usa `resync_field_mappings` por `mapping_id`

## Manutenção

### Adicionando Novo Campo

1. **Documentar aqui** primeiro
2. **Atualizar `unified_field_config`**:
   ```sql
   INSERT INTO unified_field_config (
     supabase_field, bitrix_field, sync_active, sync_priority, 
     display_name, category, field_type, transform_function, notes
   ) VALUES (
     'novo_campo', 'UF_CRM_XXX', true, 50,
     'Novo Campo', 'status', 'string', NULL, 'Descrição'
   );
   ```

3. **Atualizar `field_mappings`** (se for exibido na UI):
   ```sql
   INSERT INTO field_mappings (
     supabase_field, bitrix_field, display_name, 
     category, field_type, default_visible, sortable, priority, active
   ) VALUES (
     'novo_campo', 'UF_CRM_XXX', 'Novo Campo',
     'status', 'string', false, true, 50, true
   );
   ```

4. **Atualizar `resync_field_mappings`** (se fizer parte do resync padrão):
   ```sql
   INSERT INTO resync_field_mappings (
     mapping_name, bitrix_field, leads_column, 
     skip_if_null, priority, active
   ) VALUES (
     'Mapeamento Padrão Bitrix', 'UF_CRM_XXX', 'novo_campo',
     true, 50, true
   );
   ```

5. **Rodar queries de validação** acima

### Atualizando Campo Existente

1. **Atualizar documentação**
2. **Desativar mapeamento antigo** em TODAS as tabelas
3. **Ativar/criar mapeamento novo** em TODAS as tabelas
4. **Validar consistência** com queries acima

### Checklist de Saúde

Execute periodicamente:

- [ ] Query de duplicatas em `unified_field_config` → 0 linhas
- [ ] Query de duplicatas em `resync_field_mappings` → 0 linhas  
- [ ] Query de alinhamento entre tabelas → todos ✅
- [ ] Testar webhook com lead real → campos corretos salvos
- [ ] Testar resync com batch pequeno → campos corretos atualizados
- [ ] UI mostra colunas corretas → sem campos fantasmas

## Histórico

- **2025-01-20**: Auditoria completa do sistema
  - Alinhadas todas as 4 tabelas de mapeamento
  - Corrigidos 11+ mapeamentos duplicados/incorretos
  - Adicionada documentação sobre campos SPA
  - Criadas queries de validação de consistência
- **2025-11-19**: Limpeza inicial - removidos 11 mapeamentos duplicados
- **2025-11-19**: Corrigido mapeamento de projeto comercial (UF_CRM_1741215746)
