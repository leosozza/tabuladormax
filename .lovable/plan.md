
# Sincronização Automática de Pipelines do Bitrix

## Problema Identificado

O Bitrix possui várias pipelines (vistas na imagem):
- Central de Agendamento
- Agencia Carrão
- Pinheiros
- SNTV
- GC Models Black
- Escola Prada
- Escola de Modelo

Porém no sistema só existem **3 cadastradas** na tabela `pipeline_configs`:
| ID | Nome |
|----|------|
| 1 | Pinheiros |
| 30 | Carrão |
| 8 | Pipeline 8 |

---

## Solução Proposta

Criar uma Edge Function que busca automaticamente todas as pipelines do Bitrix e cadastra no sistema.

---

## Arquitetura

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     SINCRONIZACAO DE PIPELINES DO BITRIX                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────┐       ┌─────────────────────┐                     │
│   │  sync-pipelines     │──────▶│  Bitrix API         │                     │
│   │  Edge Function      │       │  crm.category.list  │                     │
│   │                     │◀──────│  crm.status.list    │                     │
│   └─────────────────────┘       └─────────────────────┘                     │
│            │                                                                 │
│            ▼                                                                 │
│   ┌─────────────────────┐       ┌─────────────────────┐                     │
│   │  pipeline_configs   │──────▶│  PipelineSelector   │                     │
│   │  (Banco de Dados)   │       │  (Frontend)         │                     │
│   └─────────────────────┘       └─────────────────────┘                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementacao

### 1. Nova Edge Function: `sync-pipelines-from-bitrix`

Funcionalidade:
- Chama API `crm.category.list` do Bitrix para listar todas as pipelines de negócios
- Para cada pipeline, chama `crm.status.list` para buscar os stages disponíveis
- Cria mapeamento automático de stages para status internos
- Insere ou atualiza registros na tabela `pipeline_configs`

Mapeamento automático de stages:
```text
Stage contém "NEW"       → recepcao_cadastro
Stage contém "PREPARAT"  → ficha_preenchida
Stage contém "EXECUT"    → atendimento_produtor
Stage contém "WON"       → negocios_fechados
Stage contém "LOSE"      → contrato_nao_fechado
Outros                   → analisar
```

### 2. Atualizar `sync-negotiations-from-bitrix`

Modificar para:
- Aceitar parâmetro `category_id` opcional
- Se não informado, sincronizar todas as pipelines ativas
- Usar mapeamento dinâmico da tabela `pipeline_configs`

### 3. Botão de Sincronização na UI

Adicionar na página Agenciamento:
- Botão "Sincronizar Pipelines" no dropdown de ações
- Chama a edge function `sync-pipelines-from-bitrix`
- Atualiza o seletor de pipelines automaticamente

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/sync-pipelines-from-bitrix/index.ts` | Edge Function para buscar e cadastrar pipelines do Bitrix |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-negotiations-from-bitrix/index.ts` | Aceitar category_id como parâmetro, usar mapeamento dinâmico |
| `src/pages/Agenciamento.tsx` | Adicionar botão para sincronizar pipelines |

---

## Fluxo da Edge Function

```text
1. Chamar crm.category.list?entityTypeId=2 (deals)
   → Retorna: [{ID: 1, NAME: "Pinheiros"}, {ID: 30, NAME: "Agencia Carrão"}, ...]

2. Para cada categoria, chamar crm.status.list?filter[ENTITY_ID]=DEAL_STAGE_{ID}
   → Retorna stages: [{STATUS_ID: "C1:NEW", NAME: "Recepção"}, ...]

3. Gerar mapeamento automático baseado nos nomes dos stages

4. Upsert na tabela pipeline_configs:
   - id = category.ID
   - name = category.NAME
   - stage_mapping = { stages: {...}, reverse: {...} }
```

---

## Exemplo de Resultado Esperado

Após sincronização, a tabela `pipeline_configs` terá:

| ID | Nome | Stages |
|----|------|--------|
| 1 | Pinheiros | C1:NEW, C1:UC_O2KDK6, C1:EXECUTING, ... |
| 30 | Agencia Carrão | C30:NEW, C30:WON, C30:LOSE, ... |
| 8 | SNTV | C8:NEW, C8:PREPARATION, ... |
| X | GC Models Black | CX:NEW, CX:WON, ... |
| Y | Escola Prada | CY:NEW, CY:WON, ... |
| Z | Escola de Modelo | CZ:NEW, CZ:WON, ... |
| W | Central de Agendamento | CW:NEW, CW:WON, ... |

---

## Interface Atualizada

O PipelineSelector passará a mostrar todas as pipelines sincronizadas do Bitrix, permitindo ao usuário selecionar qualquer uma delas para visualizar os deals correspondentes.

---

## Benefícios

- Não precisa cadastrar pipelines manualmente
- Mapeamento de stages automático e inteligente
- Sincronização pode ser reexecutada a qualquer momento
- Novas pipelines do Bitrix aparecem automaticamente no sistema
