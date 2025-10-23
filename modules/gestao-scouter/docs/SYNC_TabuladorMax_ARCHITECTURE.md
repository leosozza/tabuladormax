# Arquitetura - Sincronização Bidirecional TabuladorMax

Este documento descreve a arquitetura técnica da sincronização bidirecional entre Gestão Scouter e TabuladorMax.

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GESTÃO SCOUTER (Local)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐  │
│  │   Frontend   │◄────────┤  API Routes  │────────►│  Edge        │  │
│  │     (UI)     │         │              │         │  Functions   │  │
│  └──────────────┘         └──────────────┘         └──────┬───────┘  │
│                                                            │           │
│                           ┌────────────────────────────────┘           │
│                           │                                            │
│  ┌────────────────────────▼───────────────────────────────────────┐  │
│  │                    SUPABASE DATABASE                            │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │                                                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐      │  │
│  │  │   leads     │  │ sync_queue  │  │  sync_status     │      │  │
│  │  │  (mirror)   │  │   (FIFO)    │  │  (checkpoint)    │      │  │
│  │  └──────┬──────┘  └──────▲──────┘  └──────────────────┘      │  │
│  │         │                │                                     │  │
│  │         │   Trigger      │                                     │  │
│  │         └────────────────┘                                     │  │
│  │                                                                 │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────┐  │  │
│  │  │  sync_logs           │  │  sync_logs_detailed          │  │  │
│  │  │  (general audit)     │  │  (granular logging)          │  │  │
│  │  └──────────────────────┘  └──────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────▲──────────────────────────────────────┘
                                │
                                │ HTTPS / REST API
                                │ (Service Role Keys)
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                        TABULADORMAX (Remoto)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    SUPABASE DATABASE                            │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                       leads                              │  │  │
│  │  │  (source of truth para operações de tabulação)          │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxos de Sincronização

### 1. Sincronização FULL (Initial Sync)

Sincronização completa de todos os registros do TabuladorMax para Gestão Scouter.

```
┌─────────────────────────────────────────────────────────────────────┐
│ INITIAL SYNC (FULL PULL)                                           │
└─────────────────────────────────────────────────────────────────────┘

   User/Cron                Edge Function              TabuladorMax
      │                           │                          │
      │  POST /initial-sync-leads │                          │
      ├──────────────────────────►│                          │
      │                           │                          │
      │                           │  SELECT * FROM leads     │
      │                           │  (paginated, 1000/batch) │
      │                           ├─────────────────────────►│
      │                           │◄─────────────────────────┤
      │                           │      [leads batch]       │
      │                           │                          │
      │                           │  (map & normalize)       │
      │                           │                          │
      │                           │  INSERT INTO leads       │
      │                           │  (local, upsert by id)   │
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │                           │  UPDATE sync_status      │
      │                           │  (last_full_sync_at)     │
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │    ◄─── Response ─────────┤                          │
      │    { migrated: 1234,      │                          │
      │      failed: 0 }          │                          │
```

**Características:**
- Execução única ou periódica (ex: semanalmente)
- Processa TODOS os registros
- Usa paginação para grandes volumes
- Atualiza `last_full_sync_at` em `sync_status`

### 2. Sincronização Incremental PULL

Busca apenas registros modificados no TabuladorMax desde a última sincronização.

```
┌─────────────────────────────────────────────────────────────────────┐
│ INCREMENTAL SYNC - PULL (TabuladorMax → Gestão)                    │
└─────────────────────────────────────────────────────────────────────┘

   Cron Job                Edge Function              TabuladorMax
      │                           │                          │
      │  POST /sync-tabulador     │                          │
      │  ?direction=pull          │                          │
      ├──────────────────────────►│                          │
      │                           │                          │
      │                           │  SELECT last_sync_at     │
      │                           │  FROM sync_status        │
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │                           │  SELECT * FROM leads     │
      │                           │  WHERE updated_at >      │
      │                           │    last_sync_at          │
      │                           ├─────────────────────────►│
      │                           │◄─────────────────────────┤
      │                           │   [modified leads]       │
      │                           │                          │
      │                           │  UPSERT INTO leads       │
      │                           │  (local, by id)          │
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │                           │  UPDATE sync_status      │
      │                           │  (last_sync_at = NOW())  │
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │    ◄─── Response ─────────┤                          │
```

**Características:**
- Execução frequente (ex: a cada 5 minutos)
- Processa apenas registros novos/modificados
- Usa `updated_at` para determinar mudanças
- Idempotente (pode ser executado múltiplas vezes)

### 3. Sincronização Incremental PUSH

Envia registros modificados do Gestão Scouter para o TabuladorMax.

```
┌─────────────────────────────────────────────────────────────────────┐
│ INCREMENTAL SYNC - PUSH (Gestão → TabuladorMax)                    │
└─────────────────────────────────────────────────────────────────────┘

   Cron Job                Edge Function              TabuladorMax
      │                           │                          │
      │  POST /sync-tabulador     │                          │
      │  ?direction=push          │                          │
      ├──────────────────────────►│                          │
      │                           │                          │
      │                           │  SELECT * FROM leads     │
      │                           │  WHERE updated_at >      │
      │                           │    last_sync_at          │
      │                           │  AND (sync_source !=     │
      │                           │    'TabuladorMax' OR     │
      │                           │    last_synced_at old)   │
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │                           │  UPSERT INTO leads       │
      │                           ├─────────────────────────►│
      │                           │◄─────────────────────────┤
      │                           │      [success]           │
      │                           │                          │
      │                           │  UPDATE leads            │
      │                           │  SET sync_source='Gestao'│
      │                           │      last_synced_at=NOW()│
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │    ◄─── Response ─────────┤                          │
```

**Características:**
- Execução frequente (ex: a cada 5 minutos)
- Evita loops com `sync_source` e `last_synced_at`
- Usa janela de tempo (SYNC_LOOP_WINDOW_MS)
- Atualiza metadados locais após sucesso

### 4. Processamento da Fila (Queue-Based Sync)

Processamento assíncrono de alterações enfileiradas automaticamente por triggers.

```
┌─────────────────────────────────────────────────────────────────────┐
│ QUEUE-BASED SYNC (Trigger → Queue → TabuladorMax)                  │
└─────────────────────────────────────────────────────────────────────┘

   User/App              Database Trigger          Queue Processor
      │                           │                          │
      │  INSERT/UPDATE            │                          │
      │  INTO leads               │                          │
      ├──────────────────────────►│                          │
      │                           │                          │
      │                           │  IF sync_source !=       │
      │                           │    'TabuladorMax'        │
      │                           │  THEN                    │
      │                           │    INSERT INTO           │
      │                           │    sync_queue            │
      │                           ├──────────┐               │
      │                           │◄─────────┘               │
      │                           │                          │
      │  ◄─────────────────────────                          │
      │  [record saved]           │                          │
      │                           │                          │
      │                           │  (later, via cron)       │
      │                           │                          │
      │                           │   POST /process-sync-    │
      │                           │        queue             │
      │                           │   ────────────────────►  │
      │                           │                          │
      │                           │   SELECT * FROM          │
      │                           │   sync_queue             │
      │                           │   WHERE status=pending   │
      │                           │   ◄────────────────────  │
      │                           │                          │
      │                           │   FOR EACH item:         │
      │                           │     UPSERT TabuladorMax  │
      │                           │     UPDATE status        │
      │                           │   ─────────────────────► │
      │                           │                          │
      TabuladorMax                │                          │
         receives updates via     │                          │
         queue processing         │                          │
```

**Características:**
- Triggered automaticamente em INSERT/UPDATE/DELETE
- Processamento em lote (100 itens por execução)
- Retry exponencial (até SYNC_MAX_RETRIES)
- Suporta múltiplas tabelas (leads, fichas, etc)

## 🗂️ Estrutura de Dados

### Tabela: `leads`

```sql
CREATE TABLE public.leads (
  -- Identificação
  id TEXT PRIMARY KEY,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  
  -- Metadados de Sincronização
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false,
  sync_source TEXT DEFAULT 'Gestao',
  last_synced_at TIMESTAMPTZ,
  
  -- ... outros campos ...
);
```

**Campos-chave para sincronização:**
- `updated_at`: Timestamp da última modificação (atualizado por trigger)
- `sync_source`: Origem da última alteração (Gestao|TabuladorMax)
- `last_synced_at`: Quando foi sincronizado pela última vez
- `deleted`: Soft delete flag

### Tabela: `sync_queue`

```sql
CREATE TABLE public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT DEFAULT 'fichas',
  row_id TEXT,
  operation TEXT CHECK (operation IN ('insert', 'update', 'delete')),
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

**Estados possíveis:**
- `pending`: Aguardando processamento
- `processing`: Em processamento
- `completed`: Sincronizado com sucesso
- `failed`: Falhou após múltiplas tentativas

### Tabela: `sync_status`

```sql
CREATE TABLE public.sync_status (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_full_sync_at TIMESTAMPTZ,
  last_sync_success BOOLEAN DEFAULT FALSE,
  total_records INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Registro para TabuladorMax:**
```json
{
  "id": "tabulador_max_leads",
  "project_name": "TabuladorMax",
  "last_sync_at": "2025-10-18T10:30:00Z",
  "last_full_sync_at": "2025-10-18T00:00:00Z",
  "last_sync_success": true,
  "total_records": 1234
}
```

### Tabela: `sync_logs_detailed`

```sql
CREATE TABLE public.sync_logs_detailed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  table_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('success', 'error', 'warning', 'info')),
  records_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  response_data JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🛡️ Prevenção de Loops

### Problema: Loop Infinito

```
Gestão modifica lead A
  → Envia para TabuladorMax
    → TabuladorMax atualiza lead A
      → Incremental pull detecta mudança
        → Gestão recebe lead A de volta
          → Trigger detecta mudança
            → Envia para TabuladorMax novamente
              → LOOP! ♾️
```

### Solução: Múltiplas Camadas de Proteção

#### 1. Campo `sync_source`

```sql
-- Ao receber do TabuladorMax:
UPDATE leads SET sync_source = 'TabuladorMax', last_synced_at = NOW();

-- Ao enviar para TabuladorMax:
UPDATE leads SET sync_source = 'Gestao', last_synced_at = NOW();
```

#### 2. Janela de Tempo (Loop Window)

```typescript
const LOOP_WINDOW_MS = 60000; // 1 minuto

// Ignorar registros sincronizados recentemente
if (lead.sync_source === 'TabuladorMax' && 
    lead.last_synced_at &&
    (now - lead.last_synced_at) < LOOP_WINDOW_MS) {
  // Não processar (evita loop)
  return;
}
```

#### 3. Trigger com Verificação

```sql
CREATE FUNCTION enqueue_lead_for_sync() RETURNS TRIGGER AS $$
BEGIN
  -- Não enfileirar se veio do TabuladorMax recentemente
  IF NEW.sync_source = 'TabuladorMax' AND 
     NEW.last_synced_at IS NOT NULL AND 
     (EXTRACT(EPOCH FROM (NOW() - NEW.last_synced_at)) * 1000) < 60000 THEN
    RETURN NEW;
  END IF;
  
  -- Enfileirar...
END;
$$ LANGUAGE plpgsql;
```

## ⚡ Performance e Otimização

### Índices Essenciais

```sql
-- Para queries de sincronização incremental
CREATE INDEX idx_leads_sync_query 
  ON leads(updated_at, sync_source, deleted);

-- Para processamento de fila
CREATE INDEX idx_sync_queue_table_name 
  ON sync_queue(table_name, created_at);

-- Para queries de status
CREATE INDEX idx_sync_queue_status 
  ON sync_queue(status, created_at);
```

### Batch Processing

```typescript
const BATCH_SIZE = 500; // Configurável via env

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  await supabase.from('leads').upsert(batch, { onConflict: 'id' });
}
```

### Retry com Backoff Exponencial

```typescript
const MAX_RETRIES = 5;
const retry_count = item.retry_count + 1;

if (retry_count < MAX_RETRIES) {
  // Retry com backoff: 1min, 2min, 4min, 8min, 16min
  const backoff_ms = Math.pow(2, retry_count) * 60 * 1000;
  // Reagendar para processar após backoff_ms
}
```

## 🔒 Segurança

### Row Level Security (RLS)

```sql
-- Leads: Apenas autenticados podem ler
CREATE POLICY "Authenticated users can view leads"
  ON leads FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Service role pode fazer tudo
CREATE POLICY "Service role can manage leads"
  ON leads FOR ALL
  USING (auth.role() = 'service_role');

-- Tabelas de sync: SEM RLS (apenas service_role usa)
ALTER TABLE sync_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs_detailed DISABLE ROW LEVEL SECURITY;
```

### Service Role Keys

As chaves são armazenadas como **secrets** no Supabase e nunca expostas ao frontend:

```
GESTÃO SCOUTER:
  SUPABASE_SERVICE_ROLE_KEY → Acesso total ao DB local

TABULADORMAX:
  TABULADOR_SERVICE_KEY → Acesso total ao DB remoto
```

### Autenticação em Edge Functions

```typescript
// Functions não requerem JWT do usuário (verify_jwt = false)
// Mas requerem autenticação via secrets configurados
const gestao = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);
```

## 📊 Monitoramento e Observabilidade

### Métricas Importantes

1. **Taxa de Sincronização**
   ```sql
   SELECT 
     DATE_TRUNC('hour', started_at) as hour,
     AVG(records_synced) as avg_records,
     MAX(processing_time_ms) as max_time_ms
   FROM sync_logs
   GROUP BY hour
   ORDER BY hour DESC;
   ```

2. **Taxa de Erro**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'failed') as failed,
     COUNT(*) as total,
     ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / COUNT(*), 2) as error_rate
   FROM sync_queue
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Latência de Sincronização**
   ```sql
   SELECT 
     table_name,
     AVG(execution_time_ms) as avg_latency_ms,
     PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_latency_ms
   FROM sync_logs_detailed
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY table_name;
   ```

### Alertas Recomendados

1. **Fila crescendo** (> 1000 itens pendentes)
2. **Muitas falhas** (> 10% de erro)
3. **Última sincronização antiga** (> 30 minutos)
4. **Tempo de processamento alto** (> 60 segundos)

## 🔄 Ciclo de Vida de um Registro

```
1. CREATE/UPDATE em leads (via app ou import)
   │
   ├─► Trigger: trg_leads_updated_at
   │     └─► UPDATE leads SET updated_at = NOW()
   │
   └─► Trigger: trg_leads_enqueue_sync
         │
         ├─► Verifica sync_source e last_synced_at
         │
         └─► INSERT INTO sync_queue (...)
               │
               └─► Cron: process-sync-queue (a cada 1 min)
                     │
                     ├─► SELECT FROM sync_queue WHERE status='pending'
                     │
                     ├─► UPSERT em TabuladorMax
                     │
                     ├─► UPDATE leads SET last_synced_at=NOW(), sync_source='Gestao'
                     │
                     └─► UPDATE sync_queue SET status='completed'

Simultaneamente:

2. Cron: sync-tabulador?direction=pull (a cada 5 min)
   │
   ├─► SELECT FROM TabuladorMax WHERE updated_at > last_sync_at
   │
   ├─► UPSERT em leads (local)
   │     └─► Trigger NÃO enfileira (sync_source='TabuladorMax' + recente)
   │
   └─► UPDATE sync_status SET last_sync_at=NOW()
```

## 📈 Escalabilidade

### Suporte a Grande Volume

- **Paginação**: Initial sync processa em lotes de 500-1000
- **Índices**: Queries otimizadas com índices compostos
- **Batch Upsert**: Múltiplos registros por transação
- **Async Processing**: Fila desacoplada da aplicação

### Limitações Conhecidas

- **Rate Limits do Supabase**: 100 requisições/segundo (tier free)
- **Tamanho de Payload**: JSONB tem limite de ~1GB
- **Conexões Simultâneas**: Service role limitado a poucas conexões

### Recomendações para Escala

1. Aumentar `SYNC_BATCH_SIZE` conforme crescimento
2. Particionar logs por data (partitioning)
3. Arquivar logs antigos periodicamente
4. Considerar CDC (Change Data Capture) para alto volume

---

**Última atualização:** 2025-10-18
