
# Sincronização em Tempo Real com Bitrix + Suporte Multi-Pipeline

## Situação Atual

O sistema de agenciamento atualmente:
- Só suporta a Pipeline **Pinheiros** (categoria_id = 1)
- Já tem realtime funcionando na tabela `negotiations` mas NÃO na tabela `deals`
- O webhook `bitrix-deal-webhook` recebe eventos do Bitrix mas NÃO filtra por pipeline
- O mapeamento de stages está hardcoded para categoria 1 (C1:NEW, C1:WON, etc)
- Pipeline **Carrão** (categoria_id = 30) já tem dados (58 deals) mas não aparece na UI
- Pipeline 8 também existe (4 deals)

## Dados Existentes por Pipeline

| Pipeline | Categoria | Deals | Stages |
|----------|-----------|-------|--------|
| Pinheiros | 1 | 951 | C1:NEW, C1:UC_O2KDK6, C1:EXECUTING, C1:WON, C1:LOSE, C1:UC_MKIQ0S |
| Carrão | 30 | 58 | C30:WON, C30:LOSE, ... |
| Outra | 8 | 4 | C8:NEW, C8:PREPARATION, C8:UC_W27VUC |

---

## Arquitetura da Solucao

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE SINCRONIZACAO REALTIME                            │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   BITRIX24                                                                        │
│      │                                                                            │
│      ▼                                                                            │
│   ┌────────────────────┐       ┌────────────────────┐       ┌─────────────────┐  │
│   │ bitrix-deal-webhook│──────▶│    deals (DB)      │──────▶│  Realtime       │  │
│   │ - Detecta pipeline │       │ - category_id      │       │  - deals        │  │
│   │ - Mapeia stages    │       │ - stage_id         │       │  - negotiations │  │
│   └────────────────────┘       └────────────────────┘       └─────────────────┘  │
│                                         │                            │            │
│                                         ▼                            ▼            │
│                                ┌────────────────────┐      ┌─────────────────┐   │
│                                │  negotiations (DB) │      │  Frontend       │   │
│                                │  - pipeline_id NEW │◀─────│  - Filtro por   │   │
│                                │  - status          │      │    pipeline     │   │
│                                └────────────────────┘      └─────────────────┘   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mudancas Necessarias

### 1. Banco de Dados

**Adicionar coluna `pipeline_id` nas tabelas:**
- `negotiations.pipeline_id` (text) - Para filtrar por pipeline na UI
- Index para performance em queries filtradas

**Criar tabela de configuracao de pipelines:**
```sql
CREATE TABLE pipeline_configs (
  id text PRIMARY KEY, -- '1', '30', '8'
  name text NOT NULL,  -- 'Pinheiros', 'Carrão'
  description text,
  stage_mapping jsonb, -- Mapeamento de stages para status internos
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
```

### 2. Mapeamento de Stages por Pipeline

Cada pipeline tem suas proprias stages no Bitrix. O mapeamento precisa ser dinamico:

| Pipeline | Stage Bitrix | Status Interno |
|----------|--------------|----------------|
| Pinheiros (1) | C1:NEW | recepcao_cadastro |
| Pinheiros (1) | C1:UC_O2KDK6 | ficha_preenchida |
| Pinheiros (1) | C1:EXECUTING | atendimento_produtor |
| Pinheiros (1) | C1:WON | negocios_fechados |
| Pinheiros (1) | C1:LOSE | contrato_nao_fechado |
| Pinheiros (1) | C1:UC_MKIQ0S | analisar |
| Carrão (30) | C30:NEW | recepcao_cadastro |
| Carrão (30) | C30:WON | negocios_fechados |
| Carrão (30) | C30:LOSE | contrato_nao_fechado |
| ... | ... | ... |

### 3. Edge Functions a Modificar

**bitrix-deal-webhook:**
- Extrair `CATEGORY_ID` do deal
- Usar mapeamento dinamico baseado na pipeline
- Popular `pipeline_id` na negotiation criada

**sync-negotiations-from-bitrix:**
- Aceitar parametro `category_id` para filtrar por pipeline
- Usar mapeamento correto de stages por pipeline

**sync-deal-to-bitrix:**
- Buscar `pipeline_id` da negotiation/deal
- Usar mapeamento correto para converter status → stage

### 4. Frontend - Pagina Agenciamento

**Filtro por Pipeline:**
- Adicionar seletor de pipeline no topo da pagina
- Filtrar negotiations pela pipeline selecionada
- Persistir selecao no localStorage

**Realtime Melhorado:**
- Adicionar listener na tabela `deals` (alem de `negotiations`)
- Filtrar eventos por pipeline_id para evitar ruido

**UI de Pipeline:**
- Mostrar nome da pipeline no header
- Stages podem variar por pipeline (flexibilizar `PIPELINE_STATUSES`)

### 5. Sincronizacao Bidirecional

**Bitrix → Supabase (webhook):**
- Quando deal muda de stage no Bitrix, atualiza negotiation local
- Ja funciona, precisa adicionar filtro por pipeline

**Supabase → Bitrix (ao mover card):**
- Quando usuario move card no kanban, atualiza deal no Bitrix
- Precisa usar mapeamento correto por pipeline

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/usePipelines.ts` | Hook para buscar/gerenciar configuracoes de pipeline |
| `src/components/agenciamento/PipelineSelector.tsx` | Componente de selecao de pipeline |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/bitrix-deal-webhook/index.ts` | Adicionar mapeamento dinamico por pipeline |
| `supabase/functions/sync-negotiations-from-bitrix/index.ts` | Filtro por category_id e mapeamento dinamico |
| `supabase/functions/sync-deal-to-bitrix/index.ts` | Buscar pipeline e usar mapeamento correto |
| `src/pages/Agenciamento.tsx` | Adicionar seletor de pipeline, listener realtime em deals |
| `src/services/agenciamentoService.ts` | Adicionar filtro por pipeline_id |
| `src/types/agenciamento.ts` | Adicionar pipeline_id ao tipo Negotiation |
| `src/components/agenciamento/NegotiationPipeline.tsx` | Receber config de stages por pipeline |

---

## Detalhes Tecnicos

### Mapeamento Dinamico de Stages

O mapeamento sera armazenado na tabela `pipeline_configs`:

```json
// Pipeline Pinheiros (1)
{
  "stages": {
    "C1:NEW": "recepcao_cadastro",
    "C1:UC_O2KDK6": "ficha_preenchida",
    "C1:EXECUTING": "atendimento_produtor",
    "C1:WON": "negocios_fechados",
    "C1:LOSE": "contrato_nao_fechado",
    "C1:UC_MKIQ0S": "analisar"
  },
  "reverse": {
    "recepcao_cadastro": "C1:NEW",
    "ficha_preenchida": "C1:UC_O2KDK6",
    "atendimento_produtor": "C1:EXECUTING",
    "negocios_fechados": "C1:WON",
    "contrato_nao_fechado": "C1:LOSE",
    "analisar": "C1:UC_MKIQ0S"
  }
}

// Pipeline Carrão (30)
{
  "stages": {
    "C30:NEW": "recepcao_cadastro",
    "C30:WON": "negocios_fechados",
    "C30:LOSE": "contrato_nao_fechado"
  },
  "reverse": {
    "recepcao_cadastro": "C30:NEW",
    "negocios_fechados": "C30:WON",
    "contrato_nao_fechado": "C30:LOSE"
  }
}
```

### Realtime Filtering

```typescript
// Agenciamento.tsx - Listener com filtro por pipeline
useEffect(() => {
  const channel = supabase
    .channel('deals-negotiations-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'deals',
      filter: `category_id=eq.${selectedPipelineId}` // Filtro por pipeline
    }, handleDealChange)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'negotiations'
    }, handleNegotiationChange)
    .subscribe();
}, [selectedPipelineId]);
```

### Migracao de Dados Existentes

```sql
-- Adicionar pipeline_id baseado no deal
UPDATE negotiations n
SET pipeline_id = d.category_id
FROM deals d
WHERE n.deal_id = d.id
AND n.pipeline_id IS NULL;
```

---

## Ordem de Implementacao

1. **Banco de Dados** - Criar tabela pipeline_configs, adicionar coluna pipeline_id
2. **Popular Mapeamentos** - Inserir configuracoes para pipelines 1, 30, 8
3. **Edge Functions** - Atualizar webhook e sync para usar mapeamento dinamico
4. **Frontend** - Adicionar seletor de pipeline e realtime em deals
5. **Migracao** - Popular pipeline_id nos registros existentes

---

## Beneficios

- Suporte a **multiplas pipelines** (Pinheiros, Carrão, futuras)
- **Mapeamento flexivel** de stages por pipeline
- **Realtime completo** - updates em deals e negotiations
- **Acoes context-aware** - ao mover card, usa stage correta da pipeline
- Facil adicionar novas pipelines sem alterar codigo
