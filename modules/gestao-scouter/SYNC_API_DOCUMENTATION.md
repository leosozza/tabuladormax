# API de Sincronização TabuladorMax

Documentação completa dos endpoints REST para sincronização bidirecional entre Gestão Scouter e TabuladorMax.

## Autenticação

Todos os endpoints requerem autenticação via API key:

```http
x-api-key: <sua_api_key>
```

Ou no corpo da requisição:

```json
{
  "api_key": "<sua_api_key>"
}
```

## Endpoints

### 1. Webhook - Receber Dados em Lote

**Endpoint:** `POST /functions/v1/tabulador-webhook`

**Descrição:** Recebe dados em lote do TabuladorMax e insere/atualiza na tabela `fichas`.

**Headers:**
```
Content-Type: application/json
x-api-key: <TABULADOR_API_KEY>
```

**Body:**
```json
{
  "source": "TabuladorMax",
  "timestamp": "2025-10-17T10:00:00Z",
  "records": [
    {
      "id": "12345",
      "nome": "João Silva",
      "telefone": "+55 11 99999-9999",
      "email": "joao@example.com",
      "idade": "25",
      "projeto": "Projeto A",
      "scouter": "Maria Santos",
      "supervisor": "Pedro Oliveira",
      "criado": "2025-10-17T09:00:00Z",
      "valor_ficha": 50.00,
      "etapa": "Novo",
      "updated_at": "2025-10-17T10:00:00Z"
    }
  ],
  "sync_metadata": {
    "batch_id": "batch-001",
    "batch_number": 1,
    "total_batches": 10
  }
}
```

**Campos Obrigatórios:**
- `records[].id` - ID único do registro
- `records[].nome` - Nome do lead

**Response (200 OK):**
```json
{
  "success": true,
  "total_received": 100,
  "inserted": 80,
  "updated": 15,
  "duplicates_skipped": 5,
  "errors": 0,
  "error_details": [],
  "processing_time_ms": 1234,
  "batch_id": "batch-001"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Payload inválido",
  "hint": "O campo 'records' deve ser um array de registros"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "API key inválida",
  "hint": "Forneça uma API key válida no header x-api-key ou no corpo da requisição"
}
```

**Comportamento:**
- Valida campos obrigatórios antes de processar
- Compara timestamps (`updated_at`) para evitar sobrescrever dados mais recentes
- Processa em lotes de 500 registros para evitar timeout
- Registra logs detalhados em `sync_logs`
- Atualiza status em `sync_status`

---

### 2. Exportação em Lote

**Endpoint:** `POST /functions/v1/tabulador-export`

**Descrição:** Exporta dados da tabela `fichas` para o TabuladorMax.

**Headers:**
```
Content-Type: application/json
x-api-key: <GESTAO_API_KEY>
```

**Body:**
```json
{
  "filters": {
    "updated_since": "2025-10-17T00:00:00Z",
    "scouter": "Maria Santos",
    "projeto": "Projeto A",
    "ids": ["12345", "67890"]
  },
  "batch_size": 500,
  "dry_run": false
}
```

**Parâmetros (todos opcionais):**
- `filters.updated_since` - Exportar apenas registros atualizados após esta data
- `filters.scouter` - Filtrar por scouter específico
- `filters.projeto` - Filtrar por projeto específico
- `filters.ids` - Lista de IDs específicos para exportar
- `batch_size` - Tamanho do lote (padrão: 500)
- `dry_run` - Se `true`, apenas retorna quantos seriam exportados sem exportar

**Response (200 OK):**
```json
{
  "success": true,
  "total_records": 100,
  "exported": 95,
  "failed": 0,
  "skipped": 5,
  "error_details": [],
  "processing_time_ms": 2345
}
```

**Response (Dry Run):**
```json
{
  "success": true,
  "dry_run": true,
  "total_records": 100,
  "message": "100 fichas seriam exportadas",
  "sample_ids": ["12345", "67890", "11111"]
}
```

**Comportamento:**
- Busca fichas com `deleted = false`
- Compara timestamps para evitar sobrescrever dados mais recentes no TabuladorMax
- Usa `upsert` para inserir ou atualizar
- Registra logs em `sync_logs`
- Modo dry-run permite testar sem fazer alterações

---

### 3. Sincronização Bidirecional (Existente)

**Endpoint:** `POST /functions/v1/sync-tabulador`

**Descrição:** Sincronização bidirecional automática entre os dois sistemas.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "manual": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "gestao_to_tabulador": 50,
  "tabulador_to_gestao": 30,
  "conflicts_resolved": 5,
  "errors": [],
  "processing_time_ms": 3456
}
```

**Comportamento:**
- Busca registros modificados desde última sincronização
- Sincroniza em ambas as direções
- Resolve conflitos usando o timestamp mais recente
- Executa automaticamente via cron job a cada 5 minutos

---

### 4. Processar Fila de Sincronização

**Endpoint:** `POST /functions/v1/process-sync-queue`

**Descrição:** Processa itens na fila de sincronização (alterações locais aguardando exportação).

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "processed": 100,
  "succeeded": 95,
  "failed": 5,
  "processing_time_ms": 1234
}
```

**Comportamento:**
- Processa até 100 itens pendentes por execução
- Retry automático (até 3 tentativas) para itens com falha
- Atualiza `last_synced_at` nas fichas processadas
- Registra logs detalhados
- Executado automaticamente via cron job a cada 1 minuto

---

## Estrutura de Dados

### Ficha (Gestão Scouter)

```typescript
interface Ficha {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  idade?: string;
  projeto?: string;
  scouter?: string;
  supervisor?: string;
  localizacao?: string;
  latitude?: number;
  longitude?: number;
  local_da_abordagem?: string;
  criado?: string; // ISO 8601
  valor_ficha?: number;
  etapa?: string;
  ficha_confirmada?: string;
  foto?: string;
  modelo?: string;
  tabulacao?: string;
  agendado?: string;
  compareceu?: string;
  confirmado?: string;
  cadastro_existe_foto?: string;
  presenca_confirmada?: string;
  raw?: any; // Backup JSON completo
  updated_at: string; // ISO 8601
  deleted: boolean;
  sync_source?: 'Gestao' | 'TabuladorMax';
  last_synced_at?: string; // ISO 8601
}
```

### Lead (TabuladorMax)

Mesmo formato de `Ficha`, mas sem os campos `raw`, `deleted`, `sync_source` e `last_synced_at`.

---

## Logs de Sincronização

Todos os endpoints registram logs na tabela `sync_logs`:

```typescript
interface SyncLog {
  id: string;
  sync_direction: 'gestao_to_tabulador' | 'tabulador_to_gestao' | 'bidirectional';
  records_synced: number;
  records_failed: number;
  errors?: any;
  started_at: string;
  completed_at?: string;
  processing_time_ms?: number;
  metadata?: {
    batch_id?: string;
    source?: string;
    total_received?: number;
    inserted?: number;
    updated?: number;
    duplicates_skipped?: number;
  };
}
```

---

## Prevenção de Loops

O sistema implementa várias estratégias para evitar loops infinitos:

1. **Timestamp Comparison:** Apenas atualiza se o timestamp do registro recebido for mais recente
2. **Sync Source Tracking:** Campo `sync_source` identifica origem da última alteração
3. **Last Synced At:** Campo `last_synced_at` rastreia última sincronização bem-sucedida
4. **Trigger Guard:** Trigger do banco ignora alterações recentes vindas do TabuladorMax

---

## Rate Limiting

Recomendações de uso:

- **Webhook:** Máximo 10 requisições/minuto
- **Export:** Máximo 5 requisições/minuto
- **Sync (automático):** Executa automaticamente a cada 5 minutos
- **Queue Processing (automático):** Executa automaticamente a cada 1 minuto

---

## Exemplo de Integração

### Enviar Lote para Gestão Scouter

```bash
curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/tabulador-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "source": "TabuladorMax",
    "timestamp": "2025-10-17T10:00:00Z",
    "records": [
      {
        "id": "12345",
        "nome": "João Silva",
        "telefone": "+55 11 99999-9999",
        "updated_at": "2025-10-17T10:00:00Z"
      }
    ]
  }'
```

### Exportar Fichas para TabuladorMax

```bash
curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/tabulador-export \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "filters": {
      "updated_since": "2025-10-17T00:00:00Z"
    },
    "dry_run": true
  }'
```

---

## Configuração

### Variáveis de Ambiente (Supabase Secrets)

**Gestão Scouter:**
```
TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
TABULADOR_SERVICE_KEY=<service_role_key>
TABULADOR_API_KEY=<api_key_para_validacao>
GESTAO_API_KEY=<api_key_para_exportacao>
```

**TabuladorMax:**
```
GESTAO_URL=https://ngestyxtopvfeyenyvgt.supabase.co
GESTAO_SERVICE_KEY=<service_role_key>
```

### Cron Jobs

Configure no Supabase Dashboard → Edge Functions → Cron Jobs:

1. **sync-tabulador:** `*/5 * * * *` (a cada 5 minutos)
2. **process-sync-queue:** `* * * * *` (a cada 1 minuto)

---

## Troubleshooting

### Erro 401 - API key inválida
- Verifique se a API key está configurada corretamente
- Certifique-se de que está usando o header `x-api-key` ou incluindo no body

### Erro 400 - Payload inválido
- Verifique se o campo `records` é um array
- Certifique-se de que cada registro tem `id` e `nome`

### Timeout
- Reduza o tamanho do lote (`batch_size`)
- Divida a requisição em múltiplos lotes menores

### Dados não sincronizam
- Verifique os logs em `sync_logs`
- Confirme que os cron jobs estão ativos
- Verifique se há erros na tabela `sync_queue`

---

## Monitoramento

Acesse `/sync-monitor` na interface web para:
- Visualizar status de sincronização em tempo real
- Acompanhar logs detalhados
- Monitorar fila de sincronização
- Ver gráficos de performance
- Processar fila manualmente
- Disparar sincronização manual
