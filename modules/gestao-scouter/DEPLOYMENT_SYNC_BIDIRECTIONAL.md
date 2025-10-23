# Guia de Implantação: Sincronização Bidirecional
## Gestão Scouter ↔ TabuladorMax

Este guia descreve os passos para configurar a sincronização bidirecional completa entre os projetos **Gestão Scouter** (fichas) e **TabuladorMax** (leads).

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Etapa 1: Configurar Secrets no Supabase](#etapa-1-configurar-secrets-no-supabase)
4. [Etapa 2: Aplicar Migrations](#etapa-2-aplicar-migrations)
5. [Etapa 3: Deploy das Edge Functions](#etapa-3-deploy-das-edge-functions)
6. [Etapa 4: Configurar Triggers no TabuladorMax](#etapa-4-configurar-triggers-no-tabuladormax)
7. [Etapa 5: Configurar Cron Jobs](#etapa-5-configurar-cron-jobs)
8. [Etapa 6: Validação e Testes](#etapa-6-validação-e-testes)
9. [Troubleshooting](#troubleshooting)

---

## Visão Geral

### Fluxo de Sincronização

```
┌──────────────────────────────────────────────────────────────┐
│  TABULADORMAX (gkvvtfqfggddzotxltxf)                         │
│  ┌────────────────────────────────────────┐                  │
│  │ Tabela: public.leads                   │                  │
│  │ - INSERT/UPDATE/DELETE triggers        │                  │
│  └────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
                    ↓ Webhook (tempo real)
┌──────────────────────────────────────────────────────────────┐
│  GESTÃO SCOUTER (ngestyxtopvfeyenyvgt)                       │
│  ┌────────────────────────────────────────┐                  │
│  │ Edge Function: webhook-receiver        │                  │
│  │ Recebe alterações do TabuladorMax      │                  │
│  └────────────────────────────────────────┘                  │
│                    ↓                                          │
│  ┌────────────────────────────────────────┐                  │
│  │ Tabela: public.fichas                  │                  │
│  │ - Dados atualizados                    │                  │
│  └────────────────────────────────────────┘                  │
│                    ↓ Trigger                                  │
│  ┌────────────────────────────────────────┐                  │
│  │ Tabela: sync_queue                     │                  │
│  │ - Fila de alterações para exportar     │                  │
│  └────────────────────────────────────────┘                  │
│                    ↓ Cron (1 min)                             │
│  ┌────────────────────────────────────────┐                  │
│  │ Edge Function: process-sync-queue      │                  │
│  │ Exporta alterações para TabuladorMax   │                  │
│  └────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────────┐
│  TABULADORMAX (gkvvtfqfggddzotxltxf)                         │
│  ┌────────────────────────────────────────┐                  │
│  │ Tabela: public.leads                   │                  │
│  │ - Dados sincronizados                  │                  │
│  └────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### Componentes Necessários

**✅ Já Implementados:**
- Migration: `20251017_add_sync_metadata.sql` (campos de sincronização)
- Migration: `20251017_sync_queue_trigger.sql` (fila e triggers)
- Migration: `20251018_sync_fichas_leads_schema.sql` (schema completo)
- Edge Function: `webhook-receiver` (receber do TabuladorMax)
- Edge Function: `tabulador-export` (exportar para TabuladorMax)
- Edge Function: `process-sync-queue` (processar fila)
- Trigger SQL: `trigger_sync_leads_to_fichas.sql` (TabuladorMax → Gestão)

**🔧 Necessário Configurar:**
- Secrets nas Edge Functions
- Deploy das Edge Functions
- Triggers no TabuladorMax
- Cron Jobs no Supabase

---

## Pré-requisitos

### 1. Informações dos Projetos

**Gestão Scouter:**
- Project ID: `ngestyxtopvfeyenyvgt`
- URL: `https://ngestyxtopvfeyenyvgt.supabase.co`
- Publishable Key: (já configurada no .env)
- Service Role Key: **(necessária para Edge Functions)**

**TabuladorMax:**
- Project ID: `gkvvtfqfggddzotxltxf`
- URL: `https://gkvvtfqfggddzotxltxf.supabase.co`
- Publishable Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU`
- Service Role Key: **(necessária - obter do Dashboard)**

### 2. Ferramentas

```bash
# Instalar Supabase CLI
npm install -g supabase

# Verificar instalação
supabase --version
```

### 3. Acesso aos Projetos

- Acesso ao Dashboard do Supabase para ambos os projetos
- Permissões de admin/owner nos projetos

---

## Etapa 1: Configurar Secrets no Supabase

### 1.1 Obter Service Role Keys

**Gestão Scouter:**
1. Acesse https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt
2. Vá para **Settings → API**
3. Copie a **service_role key** (começa com `eyJhbGci...`)

**TabuladorMax:**
1. Acesse https://supabase.com/dashboard/project/gkvvtfqfggddzotxltxf
2. Vá para **Settings → API**
3. Copie a **service_role key**

### 1.2 Configurar Secrets nas Edge Functions (Gestão Scouter)

1. Acesse https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt
2. Vá para **Edge Functions → Secrets**
3. Adicione os seguintes secrets:

| Secret Name | Value | Descrição |
|-------------|-------|-----------|
| `SUPABASE_URL` | `https://ngestyxtopvfeyenyvgt.supabase.co` | URL do Gestão Scouter |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (Gestão Scouter) | Service key do Gestão Scouter |
| `TABULADOR_URL` | `https://gkvvtfqfggddzotxltxf.supabase.co` | URL do TabuladorMax |
| `TABULADOR_SERVICE_KEY` | `eyJhbGci...` (TabuladorMax) | Service key do TabuladorMax |
| `GESTAO_API_KEY` | `<gerar-string-aleatória>` | API key para autenticação (opcional) |
| `TABULADOR_API_KEY` | `<gerar-string-aleatória>` | API key para autenticação (opcional) |

**Gerar API Keys (opcional):**
```bash
# Linux/Mac
openssl rand -base64 32

# Ou use: https://www.uuidgenerator.net/
```

---

## Etapa 2: Aplicar Migrations

### 2.1 Verificar Migrations Existentes (Gestão Scouter)

As seguintes migrations já devem existir:

```bash
cd /home/runner/work/gestao-scouter/gestao-scouter
ls -la supabase/migrations/ | grep sync
```

**Migrations necessárias:**
- `20251017_add_sync_metadata.sql` ✅
- `20251017_sync_queue_trigger.sql` ✅
- `20251018_sync_fichas_leads_schema.sql` ✅

### 2.2 Aplicar Migrations

**Opção A: Via Supabase Dashboard**

1. Acesse https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt
2. Vá para **SQL Editor**
3. Execute cada migration na ordem:
   - `20251017_add_sync_metadata.sql`
   - `20251017_sync_queue_trigger.sql`
   - `20251018_sync_fichas_leads_schema.sql`

**Opção B: Via Supabase CLI**

```bash
# Login no Supabase
supabase login

# Link ao projeto
supabase link --project-ref ngestyxtopvfeyenyvgt

# Aplicar todas as migrations
supabase db push
```

### 2.3 Verificar Migrations Aplicadas

Execute no **SQL Editor** do Gestão Scouter:

```sql
-- Verificar tabela sync_queue
SELECT COUNT(*) FROM pg_tables WHERE tablename = 'sync_queue';
-- Esperado: 1

-- Verificar campos de sincronização em fichas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'fichas' 
  AND column_name IN ('sync_source', 'last_synced_at', 'last_sync_at', 'sync_status');
-- Esperado: 4 rows

-- Verificar triggers
SELECT tgname 
FROM pg_trigger 
WHERE tgrelid = 'public.fichas'::regclass 
  AND tgname LIKE '%sync%';
-- Esperado: fichas_sync_trigger
```

---

## Etapa 3: Deploy das Edge Functions

### 3.1 Preparar Deploy

```bash
cd /home/runner/work/gestao-scouter/gestao-scouter
```

### 3.2 Deploy Individual das Functions

**Deploy webhook-receiver:**
```bash
supabase functions deploy webhook-receiver \
  --project-ref ngestyxtopvfeyenyvgt \
  --no-verify-jwt
```

**Deploy process-sync-queue:**
```bash
supabase functions deploy process-sync-queue \
  --project-ref ngestyxtopvfeyenyvgt \
  --no-verify-jwt
```

**Deploy tabulador-export:**
```bash
supabase functions deploy tabulador-export \
  --project-ref ngestyxtopvfeyenyvgt \
  --no-verify-jwt
```

### 3.3 Verificar Deploy

1. Acesse https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt/functions
2. Verifique se as 3 funções aparecem listadas
3. Clique em cada função e vá para **Logs** para verificar se não há erros

### 3.4 Obter URLs das Functions

As URLs seguem o padrão:
```
https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/<function-name>
```

**URLs das Edge Functions:**
- Webhook Receiver: `https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/webhook-receiver`
- Process Queue: `https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/process-sync-queue`
- Export: `https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/tabulador-export`

---

## Etapa 4: Configurar Triggers no TabuladorMax

### 4.1 Habilitar Extensão HTTP

Execute no **SQL Editor** do **TabuladorMax** (gkvvtfqfggddzotxltxf):

```sql
-- Habilitar extensão HTTP (necessária para fazer requests)
CREATE EXTENSION IF NOT EXISTS http;

-- Verificar se foi instalada
SELECT * FROM pg_extension WHERE extname = 'http';
```

### 4.2 Configurar Variáveis de Ambiente no PostgreSQL

**⚠️ IMPORTANTE:** Substitua `<GESTAO_SERVICE_KEY>` pela service role key do Gestão Scouter!

Execute no **SQL Editor** do **TabuladorMax**:

```sql
-- Configurar URL do Gestão Scouter
ALTER DATABASE postgres 
SET app.gestao_scouter_url = 'https://ngestyxtopvfeyenyvgt.supabase.co';

-- Configurar Service Key do Gestão Scouter
-- ⚠️ SUBSTITUA pela service role key real!
ALTER DATABASE postgres 
SET app.gestao_scouter_service_key = '<GESTAO_SERVICE_KEY>';

-- Recarregar configurações
SELECT pg_reload_conf();

-- Verificar configurações
SHOW app.gestao_scouter_url;
SHOW app.gestao_scouter_service_key;
```

### 4.3 Criar Triggers de Sincronização

Execute o conteúdo do arquivo `supabase/functions/trigger_sync_leads_to_fichas.sql` no **SQL Editor** do **TabuladorMax**.

**Ou copie e execute o seguinte SQL:**

```sql
-- Ver arquivo: supabase/functions/trigger_sync_leads_to_fichas.sql
-- Execute todo o conteúdo desse arquivo no TabuladorMax
```

### 4.4 Verificar Triggers Instalados

Execute no **SQL Editor** do **TabuladorMax**:

```sql
-- Verificar triggers na tabela leads
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS definition
FROM pg_trigger 
WHERE tgrelid = 'public.leads'::regclass
  AND tgname LIKE '%sync%'
ORDER BY tgname;

-- Deve retornar 3 triggers:
-- - trigger_sync_lead_insert (habilitado)
-- - trigger_sync_lead_update (habilitado)
-- - trigger_sync_lead_delete (habilitado)
```

---

## Etapa 5: Configurar Cron Jobs

### 5.1 Instalar Extensão pg_cron (se necessário)

Execute no **SQL Editor** do **Gestão Scouter**:

```sql
-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verificar se foi instalada
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### 5.2 Criar Cron Job para Processar Fila

Execute no **SQL Editor** do **Gestão Scouter**:

```sql
-- Criar cron job para processar fila de sincronização a cada 1 minuto
SELECT cron.schedule(
  'process-sync-queue',           -- Nome do job
  '*/1 * * * *',                   -- A cada 1 minuto
  $$
  SELECT
    net.http_post(
      url:='https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/process-sync-queue',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

**⚠️ NOTA:** O código acima assume que você configurou a variável `app.supabase_service_key`. Caso contrário, use:

```sql
-- Configurar service key para cron jobs
ALTER DATABASE postgres 
SET app.supabase_service_key = '<GESTAO_SERVICE_KEY>';

SELECT pg_reload_conf();
```

**Alternativa (se pg_cron não estiver disponível):**

Use o **Database Webhooks** do Supabase:
1. Acesse https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt/database/hooks
2. Crie um novo webhook:
   - **Table:** `sync_queue`
   - **Events:** `INSERT`
   - **Type:** `HTTP Request`
   - **Method:** `POST`
   - **URL:** `https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/process-sync-queue`
   - **HTTP Headers:**
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer <GESTAO_SERVICE_KEY>"
     }
     ```

### 5.3 Verificar Cron Jobs

```sql
-- Listar cron jobs ativos
SELECT * FROM cron.job;

-- Ver últimas execuções
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### 5.4 Desabilitar/Remover Cron Job (se necessário)

```sql
-- Desabilitar
SELECT cron.unschedule('process-sync-queue');

-- Re-habilitar (executar novamente o SELECT cron.schedule)
```

---

## Etapa 6: Validação e Testes

### 6.1 Teste de Conectividade

Execute no terminal local:

```bash
# Testar webhook receiver
curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/webhook-receiver \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "type": "ficha",
    "data": {
      "nome": "Test Webhook",
      "projeto": "Test",
      "scouter": "Test"
    }
  }'

# Esperado: {"success":true,"message":"Webhook processed successfully"}
```

### 6.2 Teste de Sincronização TabuladorMax → Gestão

**1. Inserir lead de teste no TabuladorMax:**

Execute no **SQL Editor** do **TabuladorMax**:

```sql
INSERT INTO public.leads (nome, telefone, projeto, scouter)
VALUES ('Teste Sync Bidirecional', '11999999999', 'Teste', 'Teste Scouter')
RETURNING id;

-- Anote o ID retornado
```

**2. Verificar no Gestão Scouter (aguardar 2-3 segundos):**

Execute no **SQL Editor** do **Gestão Scouter**:

```sql
SELECT * FROM public.fichas 
WHERE nome = 'Teste Sync Bidirecional'
ORDER BY created_at DESC 
LIMIT 1;

-- Deve retornar o registro sincronizado
```

### 6.3 Teste de Sincronização Gestão → TabuladorMax

**1. Atualizar ficha no Gestão Scouter:**

Execute no **SQL Editor** do **Gestão Scouter**:

```sql
UPDATE public.fichas
SET telefone = '11888888888'
WHERE nome = 'Teste Sync Bidirecional';
```

**2. Verificar fila de sincronização:**

```sql
SELECT * FROM sync_queue 
WHERE status = 'pending'
ORDER BY created_at DESC 
LIMIT 5;

-- Deve aparecer um registro pendente
```

**3. Aguardar processamento do cron (1 minuto) ou invocar manualmente:**

```bash
curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/process-sync-queue \
  -H "Authorization: Bearer <GESTAO_SERVICE_KEY>"
```

**4. Verificar no TabuladorMax:**

Execute no **SQL Editor** do **TabuladorMax**:

```sql
SELECT * FROM public.leads 
WHERE nome = 'Teste Sync Bidirecional';

-- O telefone deve estar atualizado para '11888888888'
```

### 6.4 Limpeza do Teste

```sql
-- TabuladorMax
DELETE FROM public.leads WHERE nome = 'Teste Sync Bidirecional';

-- Gestão Scouter (se não foi deletado automaticamente)
DELETE FROM public.fichas WHERE nome = 'Teste Sync Bidirecional';
```

### 6.5 Monitoramento de Logs

**Gestão Scouter:**

```sql
-- Últimas sincronizações
SELECT * FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 10;

-- Status de sincronização
SELECT * FROM sync_status 
ORDER BY updated_at DESC;

-- Itens na fila
SELECT status, COUNT(*) 
FROM sync_queue 
GROUP BY status;
```

**Supabase Dashboard:**
1. Acesse Edge Functions → Logs
2. Verifique logs de `webhook-receiver` e `process-sync-queue`
3. Procure por erros ou warnings

---

## Troubleshooting

### ❌ Problema: Triggers não disparam no TabuladorMax

**Sintomas:**
- Alterações em `leads` não aparecem em `fichas`

**Soluções:**

1. **Verificar se os triggers estão habilitados:**
```sql
-- TabuladorMax
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'public.leads'::regclass;

-- Se tgenabled = 'D', os triggers estão desabilitados
-- Habilitar:
ALTER TABLE public.leads ENABLE TRIGGER ALL;
```

2. **Verificar variáveis de configuração:**
```sql
-- TabuladorMax
SHOW app.gestao_scouter_url;
SHOW app.gestao_scouter_service_key;

-- Se vazias, reconfigurar (ver Etapa 4.2)
```

3. **Verificar extensão HTTP:**
```sql
-- TabuladorMax
SELECT * FROM pg_extension WHERE extname = 'http';

-- Se não retornar nada:
CREATE EXTENSION IF NOT EXISTS http;
```

### ❌ Problema: Fila de sincronização não processa

**Sintomas:**
- Registros ficam com `status = 'pending'` na `sync_queue`

**Soluções:**

1. **Verificar cron job:**
```sql
-- Gestão Scouter
SELECT * FROM cron.job WHERE jobname = 'process-sync-queue';

-- Se não aparecer, recriar (ver Etapa 5.2)
```

2. **Invocar manualmente:**
```bash
curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/process-sync-queue \
  -H "Authorization: Bearer <GESTAO_SERVICE_KEY>"
```

3. **Verificar logs da Edge Function:**
- Dashboard → Edge Functions → process-sync-queue → Logs

### ❌ Problema: Erro 401 Unauthorized

**Sintomas:**
- Erro de autenticação nas Edge Functions

**Soluções:**

1. **Verificar secrets:**
- Dashboard → Edge Functions → Secrets
- Confirmar que `SUPABASE_SERVICE_ROLE_KEY` e `TABULADOR_SERVICE_KEY` estão corretas

2. **Verificar headers na requisição:**
```bash
curl -X POST <URL> \
  -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json"
```

### ❌ Problema: Dados não sincronizam completamente

**Sintomas:**
- Alguns campos estão vazios ou incorretos

**Soluções:**

1. **Verificar mapeamento de campos:**
- Ver arquivo: `docs/ANALISE_SYNC_TABULADOR.md` (seção Mapeamento de Campos)

2. **Verificar schema das tabelas:**
```sql
-- Gestão Scouter
\d+ fichas

-- TabuladorMax
\d+ leads
```

3. **Re-sincronizar dados:**
```bash
npm run migrate:leads
```

### ❌ Problema: Performance degradada

**Sintomas:**
- Sincronização demora muito
- Timeouts nas Edge Functions

**Soluções:**

1. **Reduzir batch size:**
```typescript
// supabase/functions/process-sync-queue/index.ts
.limit(50) // Reduzir de 100 para 50
```

2. **Aumentar timeout das Edge Functions:**
- Dashboard → Edge Functions → Settings
- Aumentar timeout para 30s ou 60s

3. **Limpar fila antiga:**
```sql
-- Gestão Scouter
SELECT cleanup_sync_queue(); -- Remove registros > 7 dias
```

---

## 📊 Checklist de Implantação

Use este checklist para garantir que todos os passos foram executados:

### Pré-requisitos
- [ ] Node.js 18+ instalado
- [ ] Supabase CLI instalado
- [ ] Acesso admin aos dois projetos Supabase
- [ ] Service role keys obtidas (Gestão + TabuladorMax)

### Gestão Scouter
- [ ] Migrations aplicadas (`20251017_add_sync_metadata.sql`)
- [ ] Migrations aplicadas (`20251017_sync_queue_trigger.sql`)
- [ ] Migrations aplicadas (`20251018_sync_fichas_leads_schema.sql`)
- [ ] Secrets configurados nas Edge Functions
- [ ] Edge Function `webhook-receiver` deployed
- [ ] Edge Function `process-sync-queue` deployed
- [ ] Edge Function `tabulador-export` deployed
- [ ] Cron job configurado (ou webhook alternativo)
- [ ] Tabela `sync_queue` existe
- [ ] Trigger `fichas_sync_trigger` ativo

### TabuladorMax
- [ ] Extensão `http` habilitada
- [ ] Variável `app.gestao_scouter_url` configurada
- [ ] Variável `app.gestao_scouter_service_key` configurada
- [ ] Triggers SQL instalados (3 triggers)
- [ ] Triggers habilitados na tabela `leads`

### Testes
- [ ] Teste de conectividade (webhook)
- [ ] Teste TabuladorMax → Gestão (INSERT em leads)
- [ ] Teste Gestão → TabuladorMax (UPDATE em fichas)
- [ ] Teste de DELETE
- [ ] Monitoramento de logs ativo
- [ ] Limpeza de dados de teste

---

## 📚 Documentação Adicional

- [ANALISE_SYNC_TABULADOR.md](docs/ANALISE_SYNC_TABULADOR.md) - Análise completa de sincronização
- [SYNC_LEADS_FICHAS_IMPLEMENTATION.md](SYNC_LEADS_FICHAS_IMPLEMENTATION.md) - Implementação detalhada
- [TABULADORMAX_CONFIGURATION_GUIDE.md](TABULADORMAX_CONFIGURATION_GUIDE.md) - Guia de configuração
- [SCHEMA_SYNC_FICHAS_LEADS.md](SCHEMA_SYNC_FICHAS_LEADS.md) - Schema de sincronização

---

## 🆘 Suporte

Para problemas não cobertos neste guia:

1. Consulte a seção [Troubleshooting](#troubleshooting)
2. Verifique os logs no Supabase Dashboard
3. Execute o script de diagnóstico: `npm run diagnostics:sync`
4. Abra uma issue no GitHub com os logs

---

**Última Atualização:** 2025-10-18  
**Versão:** 1.0.0
