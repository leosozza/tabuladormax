# Guia de Implementação - Sincronização Bidirecional TabuladorMax

## 📋 Visão Geral

Este guia detalha o processo de configuração e uso da sincronização bidirecional entre Gestão Scouter e TabuladorMax.

## 🎯 Objetivos Alcançados

✅ Receber e processar dados em lote do TabuladorMax via REST API  
✅ Exportar dados da tabela fichas para TabuladorMax (POST/PUT)  
✅ Registrar e exibir logs de sincronização na interface  
✅ Atualização automática quando alterações acontecem em fichas  
✅ Prevenção de loops infinitos  
✅ Rastreabilidade completa dos eventos  
✅ Estrutura de tabela fichas idêntica à leads do TabuladorMax  

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  TabuladorMax (gkvvtfqfggddzotxltxf)                   │
│  ┌────────────┐                                         │
│  │   leads    │ ← Tabela de origem                      │
│  └────────────┘                                         │
└─────────────────────────────────────────────────────────┘
                          ↕
            POST /tabulador-webhook (receber)
            POST /tabulador-export (enviar)
                          ↕
┌─────────────────────────────────────────────────────────┐
│  Gestão Scouter (ngestyxtopvfeyenyvgt)                 │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐     │
│  │   fichas   │  │  sync_queue  │  │ sync_logs  │     │
│  └────────────┘  └──────────────┘  └────────────┘     │
│         ↓ trigger                                       │
│  ┌──────────────────────────┐                          │
│  │ process-sync-queue       │ ← Cron 1min              │
│  │ (Edge Function)          │                          │
│  └──────────────────────────┘                          │
│                                                         │
│  ┌──────────────────────────┐                          │
│  │ sync-tabulador           │ ← Cron 5min              │
│  │ (Edge Function)          │                          │
│  └──────────────────────────┘                          │
└─────────────────────────────────────────────────────────┘
                          ↕
                  UI: /sync-monitor
```

## 📦 Componentes Implementados

### 1. Edge Functions

#### `tabulador-webhook`
Recebe dados em lote do TabuladorMax.

**Funcionalidades:**
- Validação de campos obrigatórios (id, nome)
- Deduplicação baseada em timestamps
- Processamento em lotes de 500
- Autenticação via API key
- Logs detalhados

**Uso:**
```bash
POST /functions/v1/tabulador-webhook
```

#### `tabulador-export`
Exporta dados para TabuladorMax.

**Funcionalidades:**
- Filtros avançados (data, scouter, projeto)
- Modo dry-run
- Processamento em lotes
- Comparação de timestamps

**Uso:**
```bash
POST /functions/v1/tabulador-export
```

#### `process-sync-queue`
Processa fila de sincronização automaticamente.

**Funcionalidades:**
- Processa até 100 itens por execução
- Retry automático (3 tentativas)
- Executa via cron a cada 1 minuto

### 2. Database

#### Tabelas

**`sync_logs`**
- Registra cada sincronização
- Metadados detalhados
- Performance metrics

**`sync_status`**
- Status atual por projeto
- Última sincronização
- Total de registros

**`sync_queue`**
- Fila de alterações pendentes
- Status e retry count
- Logs de erro

**`fichas`** (campos adicionados)
- `sync_source` - Origem da última sync
- `last_synced_at` - Timestamp da última sync

#### Triggers

**`fichas_sync_trigger`**
- Dispara em INSERT/UPDATE
- Adiciona à `sync_queue`
- Previne loops (verifica sync_source)

#### Functions

**`process_sync_queue(batch_size)`**
- Processa lote de registros
- Retorna estatísticas

**`cleanup_sync_queue()`**
- Remove registros antigos (>7 dias)

### 3. Interface Web

**Página:** `/sync-monitor`

**Features:**
- Dashboard com KPIs
- Gráficos de histórico
- Tabela de logs paginada
- Visualização da fila
- Ações manuais (sync, processar fila)

## 🚀 Setup e Configuração

### Passo 1: Aplicar Migrations

Execute as migrations no Supabase Dashboard → SQL Editor:

```sql
-- 1. Adicionar campos de metadata
-- Execute: supabase/migrations/20251017_add_sync_metadata.sql

-- 2. Criar fila e triggers
-- Execute: supabase/migrations/20251017_sync_queue_trigger.sql
```

### Passo 2: Configurar Secrets

No Supabase Dashboard → Settings → Edge Functions → Secrets:

**Gestão Scouter:**
```
TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
TABULADOR_SERVICE_KEY=<service_role_key_tabulador>
TABULADOR_API_KEY=<sua_api_key_customizada>
GESTAO_API_KEY=<sua_api_key_para_exportacao>
```

**TabuladorMax (opcional):**
```
GESTAO_URL=https://ngestyxtopvfeyenyvgt.supabase.co
GESTAO_SERVICE_KEY=<service_role_key_gestao>
```

### Passo 3: Deploy Edge Functions

```bash
# Deploy todas as functions
supabase functions deploy tabulador-webhook
supabase functions deploy tabulador-export
supabase functions deploy process-sync-queue
```

### Passo 4: Configurar Cron Jobs

No Supabase Dashboard → Edge Functions → Cron Jobs:

1. **sync-tabulador**
   - Schedule: `*/5 * * * *` (a cada 5 minutos)
   - Function: `sync-tabulador`

2. **process-sync-queue**
   - Schedule: `* * * * *` (a cada 1 minuto)
   - Function: `process-sync-queue`

### Passo 5: Testar Endpoints

```bash
# Teste webhook (receber dados)
curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/tabulador-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "source": "TabuladorMax",
    "timestamp": "2025-10-17T10:00:00Z",
    "records": [
      {
        "id": "test-123",
        "nome": "Teste",
        "updated_at": "2025-10-17T10:00:00Z"
      }
    ]
  }'

# Teste export (dry-run)
curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/tabulador-export \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "dry_run": true,
    "filters": {
      "updated_since": "2025-10-17T00:00:00Z"
    }
  }'
```

## 🔄 Fluxos de Sincronização

### Fluxo 1: TabuladorMax → Gestão (Webhook)

1. TabuladorMax envia POST para `/tabulador-webhook`
2. Webhook valida API key e dados
3. Processa em lotes de 500
4. Compara timestamps (só atualiza se mais recente)
5. Insere/atualiza na tabela `fichas`
6. Registra em `sync_logs`
7. Retorna resultado detalhado

### Fluxo 2: Gestão → TabuladorMax (Export)

**Opção A: Manual**
1. Usuário acessa `/sync-monitor`
2. Clica em "Sincronizar Agora"
3. Invoca `tabulador-export`
4. Exporta dados filtrados
5. Atualiza TabuladorMax

**Opção B: Automático (via fila)**
1. Ficha é criada/modificada no Gestão
2. Trigger adiciona à `sync_queue`
3. Cron executa `process-sync-queue` (1min)
4. Processa itens pendentes
5. Atualiza TabuladorMax
6. Marca como completado

### Fluxo 3: Sincronização Bidirecional (Cron)

1. Cron executa `sync-tabulador` (5min)
2. Busca alterações em ambos os lados
3. Detecta conflitos (mesmo ID modificado)
4. Sincroniza não-conflitantes
5. Resolve conflitos (timestamp mais recente vence)
6. Registra logs

## 🛡️ Prevenção de Loops

### Mecanismos Implementados

1. **Timestamp Comparison**
   - Só atualiza se timestamp for mais recente
   - Evita sobrescrever dados atualizados

2. **Sync Source Tracking**
   - Campo `sync_source` identifica origem
   - Trigger verifica antes de adicionar à fila

3. **Last Synced At**
   - Campo `last_synced_at` rastreia última sync
   - Trigger ignora alterações recentes (<1min)

4. **Retry Limit**
   - Máximo 3 tentativas para items com falha
   - Evita loop infinito de erros

### Exemplo de Prevenção

```sql
-- Trigger não adiciona à fila se:
IF NEW.sync_source = 'TabuladorMax' AND 
   NEW.last_synced_at IS NOT NULL AND 
   NOW() - NEW.last_synced_at < INTERVAL '1 minute' THEN
  RETURN NEW; -- Skip
END IF;
```

## 📊 Monitoramento

### KPIs Disponíveis

- **Total Sincronizado:** Soma de registros sincronizados
- **Falhas:** Total de erros
- **Tempo Médio:** Performance média
- **Fila Pendente:** Items aguardando processamento

### Visualizações

1. **Gráfico de Área:** Histórico de sincronizações
2. **Linha de Tempo:** Performance ao longo do tempo
3. **Tabela de Logs:** Detalhes de cada sincronização
4. **Tabela de Fila:** Status de items pendentes

### Alertas

- Sincronização falhou: Badge vermelho
- Fila com itens: Contador destacado
- Erros recentes: Exibição de mensagem

## 🧪 Testes

### Teste 1: Receber Dados

```bash
# Enviar 1 registro
curl -X POST https://YOUR_URL/functions/v1/tabulador-webhook \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "TabuladorMax",
    "records": [{
      "id": "test-001",
      "nome": "Teste",
      "telefone": "11999999999",
      "updated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }]
  }'

# Verificar no banco
SELECT * FROM fichas WHERE id = 'test-001';
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 1;
```

### Teste 2: Exportar Dados

```bash
# Dry-run primeiro
curl -X POST https://YOUR_URL/functions/v1/tabulador-export \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": true,
    "filters": {
      "ids": ["test-001"]
    }
  }'

# Exportar de verdade
curl -X POST https://YOUR_URL/functions/v1/tabulador-export \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "ids": ["test-001"]
    }
  }'
```

### Teste 3: Fila de Sincronização

```sql
-- Inserir ficha
INSERT INTO fichas (id, nome, sync_source, updated_at)
VALUES ('test-002', 'Teste Fila', 'Gestao', NOW());

-- Verificar fila
SELECT * FROM sync_queue WHERE ficha_id = 'test-002';

-- Processar manualmente (ou aguardar cron)
SELECT * FROM process_sync_queue(10);

-- Verificar se foi processado
SELECT status FROM sync_queue WHERE ficha_id = 'test-002';
```

### Teste 4: Prevenção de Loops

```sql
-- Simular recebimento do TabuladorMax
UPDATE fichas 
SET 
  nome = 'Atualizado',
  sync_source = 'TabuladorMax',
  last_synced_at = NOW(),
  updated_at = NOW()
WHERE id = 'test-001';

-- Verificar que NÃO foi adicionado à fila
SELECT COUNT(*) FROM sync_queue 
WHERE ficha_id = 'test-001' 
  AND created_at > NOW() - INTERVAL '1 minute';
-- Deve retornar 0
```

## 📈 Performance

### Benchmarks Esperados

| Operação | Registros | Tempo Esperado |
|----------|-----------|----------------|
| Webhook (receber) | 1000 | ~2-3s |
| Export (enviar) | 1000 | ~3-4s |
| Process Queue | 100 | ~1-2s |
| Sync Bidirecional | 200 | ~5-8s |

### Otimizações

- Processamento em lotes (500-1000)
- Índices em campos críticos
- Queries otimizadas
- Cleanup automático de logs antigos

## 🔧 Troubleshooting

### Problema: Webhook retorna 401

**Causa:** API key inválida ou não configurada

**Solução:**
```bash
# Verificar secret
supabase secrets list

# Configurar secret
supabase secrets set TABULADOR_API_KEY=your_key
```

### Problema: Fila não processa

**Causa:** Cron job não configurado ou edge function com erro

**Solução:**
1. Verificar cron job no Dashboard
2. Ver logs da edge function
3. Processar manualmente: `SELECT * FROM process_sync_queue(100);`

### Problema: Loop infinito

**Causa:** Trigger não está funcionando corretamente

**Solução:**
1. Verificar se campos `sync_source` e `last_synced_at` existem
2. Re-executar migration de triggers
3. Verificar logs em `sync_queue` para items repetidos

### Problema: Dados não aparecem

**Causa:** Timestamp mais antigo ou registro deletado

**Solução:**
```sql
-- Verificar registro
SELECT * FROM fichas WHERE id = 'ID_AQUI';

-- Verificar logs
SELECT * FROM sync_logs 
WHERE errors IS NOT NULL 
ORDER BY started_at DESC 
LIMIT 5;
```

## 📚 Documentação Adicional

- [SYNC_API_DOCUMENTATION.md](./SYNC_API_DOCUMENTATION.md) - Referência completa da API
- [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md) - Arquitetura do sistema
- [README.md](./README.md) - Documentação geral do projeto

## 🎉 Próximos Passos

1. ✅ Aplicar migrations
2. ✅ Configurar secrets
3. ✅ Deploy edge functions
4. ✅ Configurar cron jobs
5. ⏳ Testar endpoints
6. ⏳ Validar prevenção de loops
7. ⏳ Monitorar em produção
8. ⏳ Ajustar performance conforme necessário

## 💡 Dicas

- Use dry-run para testar exportações
- Monitore a fila regularmente
- Configure alertas para falhas
- Faça backup antes de grandes sincronizações
- Use filtros para exportações incrementais
- Mantenha logs por pelo menos 30 dias

---

**Implementado por:** GitHub Copilot  
**Data:** 17 de Outubro de 2025  
**Versão:** 1.0
