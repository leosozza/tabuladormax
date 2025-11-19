# Mapeamentos Oficiais Bitrix → TabuladorMax

**Última atualização:** 2025-11-19  
**Status:** ✅ Sem duplicatas

## Resumo

Este documento define os mapeamentos oficiais entre campos do Bitrix24 e campos da tabela `leads` no TabuladorMax. Após a limpeza de 2025-11-19, cada campo tem **apenas 1 mapeamento ativo**.

## Campos Principais

| Campo Supabase | Campo Bitrix | Tipo | Prioridade | Notas |
|---|---|---|---|---|
| name | NAME | string | 0 | Primeiro nome do lead |
| responsible | ASSIGNED_BY_ID | integer | 1 | ID do usuário responsável no Bitrix |
| fonte | SOURCE_ID | string | 60 | Origem/fonte do lead |
| telefone_casa | UF_CRM_1762868715 | string | 80 | Telefone residencial |
| local_abordagem | ADDRESS_CITY | string | 40 | Cidade do endereço |
| ficha_confirmada | UF_CRM_1729776113 | boolean | 50 | Status de confirmação da ficha |
| presenca_confirmada | UF_CRM_1729776132 | boolean | 50 | Confirmação de presença |
| etapa_funil | UF_CRM_1742391480 | string | 30 | Etapa do funil de vendas |
| gerenciamento_funil | UF_CRM_1742391351 | string | 30 | Gerenciamento do funil |
| etapa_fluxo | UF_CRM_1742391534 | string | 30 | Etapa do fluxo de trabalho |

## Campos com Transformação

Estes campos requerem transformação de dados durante a sincronização:

| Campo Supabase | Campo Bitrix | Transform Function | Descrição |
|---|---|---|---|
| commercial_project_id | UF_CRM_1741215746 | bitrixProjectCodeToUUID | Converte código do projeto (ex: "PIN") para UUID |
| nome_modelo | UF_CRM_LEAD_1732627097745 | - | Nome do modelo (campo UF) |
| scouter | UF_CRM_1742226427 | - | Scouter responsável |
| etapa | STATUS_ID | - | Status/etapa do lead |

## Campos Desativados (2025-11-19)

Os seguintes mapeamentos foram desativados por serem duplicados:

### telefone_casa
- ❌ PHONE (prioridade 70, menos específico)
- ❌ UF_CRM_1729775837 (prioridade 0, sem notas)
- ✅ **UF_CRM_1762868715** (mantido - prioridade 80, "Telefone residencial")

### etapa_fluxo
- ❌ UF_CRM_1741961401 (prioridade 0)
- ✅ **UF_CRM_1742391534** (mantido - prioridade 30, "Etapa do fluxo")

### etapa_funil
- ❌ UF_CRM_1744324211 (prioridade 0)
- ✅ **UF_CRM_1742391480** (mantido - prioridade 30, "Etapa do funil")

### ficha_confirmada
- ❌ UF_CRM_1737378043893 (prioridade 0)
- ✅ **UF_CRM_1729776113** (mantido - prioridade 50)

### fonte
- ❌ UF_CRM_1729776032 (prioridade 0)
- ✅ **SOURCE_ID** (mantido - prioridade 60, campo padrão)

### gerenciamento_funil
- ❌ UF_CRM_1744320647 (prioridade 0)
- ✅ **UF_CRM_1742391351** (mantido - prioridade 30)

### local_abordagem
- ❌ UF_CRM_1729775954 (prioridade 0)
- ✅ **ADDRESS_CITY** (mantido - prioridade 40, campo padrão)

### name
- ❌ TITLE (prioridade 0, campo título genérico)
- ✅ **NAME** (mantido - prioridade 0, campo nome específico)

### presenca_confirmada
- ❌ UF_CRM_1729776110 (prioridade 0)
- ✅ **UF_CRM_1729776132** (mantido - prioridade 50)

### responsible
- ❌ UF_CRM_1622827519 (prioridade 0, campo customizado)
- ✅ **ASSIGNED_BY_ID** (mantido - prioridade 1, campo padrão)

## Validação

Para validar que não há duplicatas:

```sql
-- Query de validação - deve retornar 0 linhas
SELECT 
  tabuladormax_field,
  COUNT(*) as active_mappings,
  array_agg(bitrix_field ORDER BY priority DESC) as bitrix_fields
FROM bitrix_field_mappings
WHERE active = true
GROUP BY tabuladormax_field
HAVING COUNT(*) > 1;
```

## Sincronização

Os mapeamentos são utilizados em:

1. **Webhook Bitrix → Supabase** (`bitrix-webhook/index.ts`)
2. **Sincronização Supabase → Bitrix** (`sync-to-bitrix/index.ts`)
3. **Importação em lote** (`bitrix-import-batch/index.ts`)

## Manutenção

- Novos mapeamentos devem ser adicionados via interface Admin ou diretamente na tabela `bitrix_field_mappings`
- Sempre definir `priority` maior que 0 para campos importantes
- Adicionar `notes` descritivas para facilitar manutenção futura
- Verificar duplicatas antes de ativar novos mapeamentos

## Histórico

- **2025-11-19**: Limpeza inicial - removidos 11 mapeamentos duplicados
- **2025-11-19**: Corrigido mapeamento de projeto comercial (UF_CRM_1741215746)
