# Arquitetura de Sincronização - TabuladorMax

## Visão Geral do Sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│                         TABULADORMAX                                  │
│                                                                       │
│  ┌─────────────┐      ┌──────────────┐      ┌──────────────┐       │
│  │   Leads     │◄────►│ sync_events  │◄────►│  UI Monitor  │       │
│  │   Table     │      │    (logs)    │      │ /sync-monitor│       │
│  └──────┬──────┘      └──────────────┘      └──────────────┘       │
│         │                                                            │
│         │ Trigger: sync_lead_to_gestao_scouter_on_update            │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  trigger_sync_to_gestao_scouter()                    │           │
│  │  - Verifica sync_source != 'gestao_scouter'          │           │
│  │  - Verifica config ativa                              │           │
│  │  - Chama Edge Function via HTTP POST                  │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
                          │ HTTP POST
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION                                      │
│              sync-to-gestao-scouter                                   │
│                                                                       │
│  1. Recebe lead data                                                 │
│  2. Verifica loop (source != 'gestao_scouter')                       │
│  3. Busca gestao_scouter_config                                      │
│  4. Cria cliente Supabase para gestao-scouter                        │
│  5. UPSERT na tabela fichas                                          │
│  6. Marca sync_source = 'tabuladormax'                               │
│  7. Registra em sync_events                                          │
│                                                                       │
└──────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Supabase REST API
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      GESTAO-SCOUTER                                   │
│                                                                       │
│  ┌─────────────┐                                                     │
│  │   Fichas    │  (espelho de leads)                                 │
│  │   Table     │                                                     │
│  └──────┬──────┘                                                     │
│         │                                                            │
│         │ Trigger: sync_ficha_to_tabuladormax_on_update             │
│         ▼                                                            │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  trigger_sync_to_tabuladormax()                      │           │
│  │  - Verifica sync_source != 'tabuladormax'            │           │
│  │  - Chama Edge Function do TabuladorMax via HTTP POST │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
                          │ HTTP POST
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION                                      │
│             sync-from-gestao-scouter                                  │
│                                                                       │
│  1. Recebe ficha data                                                │
│  2. Verifica loop (source != 'tabuladormax')                         │
│  3. UPSERT na tabela leads                                           │
│  4. Marca sync_source = 'gestao_scouter'                             │
│  5. Registra em sync_events                                          │
│                                                                       │
└──────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ Update
                          ▼
                  ┌──────────────┐
                  │    Leads     │
                  │    Table     │
                  └──────────────┘
```

## Prevenção de Loops

### Mecanismo de Proteção

```
┌─────────────────────────────────────────────────────────┐
│ Lead atualizado no TabuladorMax                         │
│ sync_source = NULL ou 'bitrix' ou 'csv'                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Trigger verifica: sync_source != 'gestao_scouter' ?     │
│ Se SIM: continua                                         │
│ Se NÃO: RETURN (previne loop)                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Edge Function sincroniza → gestao-scouter               │
│ Marca ficha.sync_source = 'tabuladormax'                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Ficha atualizada no gestao-scouter                      │
│ sync_source = 'tabuladormax'                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Trigger verifica: sync_source != 'tabuladormax' ?       │
│ Se SIM: continua                                         │
│ Se NÃO: RETURN (previne loop) ✓✓✓                       │
└──────────────────────────────────────────────────────────┘
```

## Sincronizações Paralelas

O sistema suporta 3 sincronizações simultâneas:

```
                    ┌─────────────┐
                    │    Leads    │
                    │    Table    │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐    ┌──────────┐
    │  Bitrix  │     │ gestao-  │    │   CSV    │
    │  (CRM)   │     │ scouter  │    │ Import   │
    └──────────┘     └──────────┘    └──────────┘
```

### Direções Disponíveis em sync_events

1. `bitrix_to_supabase` - Importação do Bitrix
2. `supabase_to_bitrix` - Exportação para Bitrix
3. `csv_import` - Importação via CSV
4. `supabase_to_gestao_scouter` - **NOVO** ✓
5. `gestao_scouter_to_supabase` - **NOVO** ✓

## Fluxo de Dados Detalhado

### 1. Atualização no TabuladorMax

```sql
-- Usuário atualiza lead
UPDATE leads 
SET name = 'João Silva', age = 25 
WHERE id = 123;

-- Trigger dispara automaticamente
CREATE TRIGGER sync_lead_to_gestao_scouter_on_update
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.sync_source IS DISTINCT FROM 'gestao_scouter')
  EXECUTE FUNCTION trigger_sync_to_gestao_scouter();

-- Função verifica e chama Edge Function
SELECT net.http_post(
  url := 'https://[project].supabase.co/functions/v1/sync-to-gestao-scouter',
  headers := '{"Authorization": "Bearer [key]"}',
  body := '{"lead": {...}, "source": "supabase"}'
);
```

### 2. Edge Function Processa

```typescript
// sync-to-gestao-scouter/index.ts
const { lead, source } = await req.json();

// Previne loop
if (source === 'gestao_scouter') {
  return { success: true, message: 'Ignored - loop prevention' };
}

// Busca config
const { data: config } = await supabase
  .from('gestao_scouter_config')
  .select('*')
  .eq('active', true)
  .single();

// Sincroniza
const gestaoClient = createClient(config.project_url, config.anon_key);
await gestaoClient.from('fichas').upsert({
  ...lead,
  sync_source: 'tabuladormax' // Marca origem
});

// Registra log
await supabase.from('sync_events').insert({
  direction: 'supabase_to_gestao_scouter',
  status: 'success',
  lead_id: lead.id
});
```

### 3. Sincronização Reversa

```typescript
// gestao-scouter trigger chama
POST https://[tabuladormax].supabase.co/functions/v1/sync-from-gestao-scouter
Body: { ficha: {...}, source: 'gestao_scouter' }

// sync-from-gestao-scouter/index.ts
if (source === 'tabuladormax') {
  return { success: true }; // Loop prevention
}

await supabase.from('leads').upsert({
  ...ficha,
  sync_source: 'gestao_scouter' // Marca origem
});
```

## Tabelas e Relacionamentos

```
┌──────────────────────────────────────────┐
│ gestao_scouter_config                    │
├──────────────────────────────────────────┤
│ id              UUID PK                  │
│ project_url     TEXT                     │
│ anon_key        TEXT                     │
│ active          BOOLEAN                  │
│ sync_enabled    BOOLEAN                  │
│ created_at      TIMESTAMPTZ              │
│ updated_at      TIMESTAMPTZ              │
└──────────────────────────────────────────┘
          │
          │ usado por
          ▼
┌──────────────────────────────────────────┐
│ trigger_sync_to_gestao_scouter()         │
│ - Verifica active && sync_enabled        │
│ - Busca project_url e anon_key           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ sync_events                              │
├──────────────────────────────────────────┤
│ id              UUID PK                  │
│ event_type      TEXT (create/update)     │
│ direction       TEXT (5 opções)          │
│ lead_id         BIGINT                   │
│ status          TEXT (success/error)     │
│ error_message   TEXT                     │
│ sync_duration_ms INTEGER                 │
│ created_at      TIMESTAMPTZ              │
└──────────────────────────────────────────┘
          │
          │ exibido em
          ▼
┌──────────────────────────────────────────┐
│ UI /sync-monitor                         │
│ - MetricsCards (Bitrix)                  │
│ - GestaoScouterMetrics (novo)            │
│ - SyncTimelineChart                      │
│ - SyncDirectionChart                     │
│ - SyncLogsTable                          │
└──────────────────────────────────────────┘
```

## Monitoramento em Tempo Real

### Dashboard UI (/sync-monitor)

```
┌─────────────────────────────────────────────────────────┐
│ Métricas em Tempo Real - Bitrix                         │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Success │ │Success │ │ Errors │ │ Speed  │            │
│ │  150   │ │  98.5% │ │   2    │ │ 2.5/min│            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Sincronização com Gestão Scouter          ● Ativo      │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Success │ │ Errors │ │→Gestão │ │←Gestão │            │
│ │   42   │ │   1    │ │   25   │ │   18   │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Timeline (Últimos 30 dias)                              │
│     ▃▅▃▅▇█▇▅▃▅▇▅▃▅▇█▅▃▅▇▅                              │
│ Success: ■■■  Errors: ■■■                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Direção das Sincronizações (Pie Chart)                  │
│        ╱─────────────╲                                  │
│      ╱   Bitrix→Sup   ╲    45%                          │
│     │    Sup→Bitrix    │   30%                          │
│     │   Sup→Gestão     │   15%                          │
│      ╲  Gestão→Sup    ╱    10%                          │
│        ╲─────────────╱                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Últimas Sincronizações (100 registros)                  │
│ ┌──────────────┬───────┬──────────────┬────┬────────┐  │
│ │ Data/Hora    │ Tipo  │ Direção      │ ID │ Status │  │
│ ├──────────────┼───────┼──────────────┼────┼────────┤  │
│ │ 17/10 01:30  │update │ Sup→Gestão   │123 │   ✓    │  │
│ │ 17/10 01:29  │update │ Gestão→Sup   │456 │   ✓    │  │
│ │ 17/10 01:28  │update │ Bitrix→Sup   │789 │   ✓    │  │
│ │ 17/10 01:27  │update │ Sup→Bitrix   │123 │   ✗    │  │
│ └──────────────┴───────┴──────────────┴────┴────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Queries de Monitoramento

```sql
-- Sincronizações por direção (últimas 24h)
SELECT 
  direction,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM sync_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY direction;

-- Performance por direção
SELECT 
  direction,
  AVG(sync_duration_ms) as avg_ms,
  MIN(sync_duration_ms) as min_ms,
  MAX(sync_duration_ms) as max_ms
FROM sync_events
WHERE sync_duration_ms IS NOT NULL
GROUP BY direction;

-- Últimos erros gestao-scouter
SELECT *
FROM sync_events
WHERE status = 'error'
  AND direction LIKE '%gestao_scouter%'
ORDER BY created_at DESC
LIMIT 10;
```

## Segurança e Compliance

### RLS (Row Level Security)

```sql
-- TabuladorMax
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_scouter_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- gestao-scouter
ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;
```

### Autenticação

- **TabuladorMax → gestao-scouter**: Usa anon_key configurada
- **gestao-scouter → TabuladorMax**: Usa endpoint público Edge Function
- **Logs**: Service Role Key (acesso admin)

### Auditoria

Todos os eventos são registrados em `sync_events`:
- Timestamp exato
- Direção da sincronização
- Lead/Ficha ID
- Status (success/error)
- Mensagem de erro (se houver)
- Duração em ms

---

**Última atualização**: 2025-10-17  
**Versão**: 1.0
