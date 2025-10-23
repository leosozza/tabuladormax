# Guia de Configuração - Sincronização com TabuladorMax

Este guia descreve como configurar a sincronização bidirecional entre os projetos Supabase **Gestão Scouter** e **TabuladorMax**.

## 📋 Pré-requisitos

Antes de iniciar, você precisa ter:

1. **Dois projetos Supabase ativos:**
   - Projeto Gestão Scouter (local)
   - Projeto TabuladorMax (remoto)

2. **Credenciais de ambos os projetos:**
   - URL base do projeto (`https://xxx.supabase.co`)
   - Service Role Key (encontrada em Project Settings → API → service_role)

3. **Acesso ao Dashboard do Supabase** com permissões de administrador

4. **CLI do Supabase** instalado (opcional, para deploy local)

## 🚀 Passo 1: Executar a Migration

### 1.1. Aplicar Migration no Gestão Scouter

A migration `20251018_sync_leads_tabMax.sql` cria toda a infraestrutura necessária:

**Via Dashboard:**
1. Acesse o Dashboard do Supabase
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Cole o conteúdo do arquivo `supabase/migrations/20251018_sync_leads_tabMax.sql`
5. Execute a query

**Via CLI:**
```bash
supabase db push
```

### 1.2. Verificar a Migration

Execute esta query para confirmar que tudo foi criado:

```sql
-- Verificar tabelas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('leads', 'sync_queue', 'sync_logs_detailed', 'sync_status')
ORDER BY tablename;

-- Verificar triggers em leads
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'leads';

-- Verificar health da sincronização
SELECT * FROM check_sync_health();
```

## 🔐 Passo 2: Configurar Secrets

As Edge Functions precisam de credenciais de ambos os projetos para funcionar.

### 2.1. Adicionar Secrets via Dashboard

1. Acesse o Dashboard do **Gestão Scouter**
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. Adicione os seguintes secrets (clique em **Add secret** para cada um):

| Nome da Secret | Valor | Descrição |
|----------------|-------|-----------|
| `SUPABASE_URL` | `https://your-gestao.supabase.co` | URL do projeto Gestão Scouter |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Service Role Key do Gestão Scouter |
| `TABULADOR_URL` | `https://your-tabulador.supabase.co` | URL do projeto TabuladorMax |
| `TABULADOR_SERVICE_KEY` | `eyJhbG...` | Service Role Key do TabuladorMax |
| `TABULADOR_SERVICE_ROLE_KEY` | `eyJhbG...` | Alias para compatibilidade |
| `SYNC_BATCH_SIZE` | `500` | Registros por lote (100-1000) |
| `SYNC_MAX_RETRIES` | `5` | Tentativas antes de marcar como failed |
| `SYNC_LOOP_WINDOW_MS` | `60000` | Janela anti-loop (ms) |
| `SYNC_IGNORE_SOURCE` | `TabuladorMax` | Origem a ignorar (evita loops) |

### 2.2. Verificar Secrets

Para verificar se os secrets foram configurados corretamente, você pode testar a função de conexão:

```bash
curl -X POST \
  https://your-gestao-project.supabase.co/functions/v1/test-tabulador-connection \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Resposta esperada (sucesso):
```json
{
  "timestamp": "2025-10-18T...",
  "environment": {
    "TABULADOR_URL": "✅ Configurado",
    "TABULADOR_SERVICE_KEY": "✅ Configurado"
  },
  "connection": {
    "status": "✅ Cliente criado"
  },
  "tables": {
    "leads": {
      "status": "✅ Acessível",
      "total_count": 1234,
      "sample_count": 5
    }
  }
}
```

## ⚙️ Passo 3: Configurar Cron Jobs

Para sincronização automática, configure cron jobs que invocam as Edge Functions periodicamente.

### 3.1. Opção A: Cron via Serviço Externo (Recomendado)

Use um serviço como [cron-job.org](https://cron-job.org) ou [EasyCron](https://easycron.com):

**Process Sync Queue (a cada 1 minuto):**
```
URL: https://your-gestao.supabase.co/functions/v1/process-sync-queue
Schedule: */1 * * * *
Method: POST
Headers: Authorization: Bearer YOUR_ANON_KEY
```

**Sync Incremental Pull (a cada 5 minutos):**
```
URL: https://your-gestao.supabase.co/functions/v1/sync-tabulador?direction=pull
Schedule: */5 * * * *
Method: POST
Headers: Authorization: Bearer YOUR_ANON_KEY
```

**Sync Incremental Push (a cada 5 minutos):**
```
URL: https://your-gestao.supabase.co/functions/v1/sync-tabulador?direction=push
Schedule: */5 * * * *
Method: POST
Headers: Authorization: Bearer YOUR_ANON_KEY
```

### 3.2. Opção B: Cron via pg_cron (Avançado)

Se você tem acesso ao pg_cron no seu projeto Supabase:

```sql
-- Habilitar pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar process-sync-queue a cada 1 minuto
SELECT cron.schedule(
  'process-sync-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-gestao.supabase.co/functions/v1/process-sync-queue',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Agendar sync incremental a cada 5 minutos
SELECT cron.schedule(
  'sync-tabulador-pull',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-gestao.supabase.co/functions/v1/sync-tabulador?direction=pull',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

## 🎯 Passo 4: Executar Sincronização Inicial

Após configurar tudo, execute a sincronização inicial (full sync) uma vez:

```bash
curl -X POST \
  https://your-gestao-project.supabase.co/functions/v1/initial-sync-leads \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Isso irá:
1. Buscar TODOS os leads do TabuladorMax
2. Inserir/atualizar na tabela `leads` do Gestão Scouter
3. Registrar a última sincronização completa em `sync_status`

**Nota:** Esta operação pode demorar dependendo da quantidade de registros. Monitore os logs.

## 📊 Passo 5: Monitorar Sincronização

### 5.1. Via SQL Queries

**Verificar status da sincronização:**
```sql
SELECT * FROM sync_status WHERE id = 'tabulador_max_leads';
```

**Ver últimos logs:**
```sql
SELECT * FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 10;
```

**Ver logs detalhados:**
```sql
SELECT * FROM sync_logs_detailed 
WHERE table_name = 'leads'
ORDER BY created_at DESC 
LIMIT 20;
```

**Ver itens pendentes na fila:**
```sql
SELECT 
  table_name,
  status,
  COUNT(*) as count
FROM sync_queue
GROUP BY table_name, status
ORDER BY table_name, status;
```

**Health check:**
```sql
SELECT * FROM check_sync_health();
```

### 5.2. Via Dashboard (Se Implementado)

No painel de configurações do Gestão Scouter, você pode:
- Ver status de sincronização em tempo real
- Executar sincronizações manuais
- Ver logs e métricas
- Processar fila manualmente

## 🔧 Troubleshooting

### Erro 406: Not Acceptable

**Causa:** TabuladorMax não aceita requisições sem headers corretos.

**Solução:** Certifique-se de que as Edge Functions estão enviando:
```javascript
headers: {
  'Prefer': 'return=representation',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

### Erro 404: Table not found (PGRST116)

**Causa:** Tabela `leads` não existe no TabuladorMax OU não existe no Gestão Scouter.

**Solução:**
1. Verifique se a migration foi executada no Gestão Scouter
2. Verifique se a tabela `leads` existe no TabuladorMax:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'leads' AND table_schema = 'public';
   ```

### Erro 42501: Permission denied

**Causa:** Service Role Key sem permissões suficientes.

**Solução:**
1. Verifique se está usando a **Service Role Key** (não a anon key)
2. Confirme que a RLS está configurada corretamente
3. Execute no Gestão Scouter:
   ```sql
   GRANT ALL ON public.leads TO postgres, service_role;
   ```

### Muitos itens na fila (pending)

**Causa:** `process-sync-queue` não está rodando ou está falhando.

**Solução:**
1. Verifique logs da função `process-sync-queue`
2. Execute manualmente para testar:
   ```bash
   curl -X POST \
     https://your-project.supabase.co/functions/v1/process-sync-queue \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```
3. Verifique itens com status `failed`:
   ```sql
   SELECT * FROM sync_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
   ```

### Rate Limit (429 Too Many Requests)

**Causa:** Muitas requisições simultâneas ao TabuladorMax.

**Solução:**
1. Reduza `SYNC_BATCH_SIZE` para 100-200
2. Aumente intervalo dos cron jobs (ex: */10 minutos)
3. Adicione delays entre lotes no código

## 🧹 Manutenção

### Limpar Fila Antiga

A função `cleanup_old_sync_queue()` remove registros completados com mais de 7 dias:

```sql
SELECT cleanup_old_sync_queue();
```

Configure um cron para executar semanalmente:

```sql
SELECT cron.schedule(
  'cleanup-sync-queue',
  '0 2 * * 0',  -- Domingo às 2am
  $$ SELECT cleanup_old_sync_queue(); $$
);
```

### Resetar Sincronização

Se precisar resetar e começar do zero:

```sql
-- Limpar fila
TRUNCATE sync_queue;

-- Limpar logs (cuidado!)
TRUNCATE sync_logs;
TRUNCATE sync_logs_detailed;

-- Resetar status
UPDATE sync_status 
SET last_sync_at = NULL, 
    last_full_sync_at = NULL,
    last_sync_success = false,
    total_records = 0
WHERE id = 'tabulador_max_leads';

-- Executar initial sync novamente
-- (via curl ou Dashboard)
```

## 📚 Próximos Passos

1. Leia [SYNC_TabuladorMax_ARCHITECTURE.md](./SYNC_TabuladorMax_ARCHITECTURE.md) para entender a arquitetura
2. Configure alertas para monitorar falhas de sincronização
3. Implemente interface de usuário para facilitar operações manuais
4. Configure backups regulares de ambos os bancos de dados

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs das Edge Functions no Dashboard
2. Execute queries de diagnóstico fornecidas neste guia
3. Consulte a documentação técnica em `SYNC_TabuladorMax_ARCHITECTURE.md`
4. Entre em contato com o time de desenvolvimento

---

**Última atualização:** 2025-10-18
