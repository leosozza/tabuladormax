# Análise de Sincronização: TabuladorMax ↔ Gestão Scouter

## 📋 Índice

1. [Arquitetura de Dados e Fluxo](#arquitetura-de-dados-e-fluxo)
2. [Checklist de Ambiente](#checklist-de-ambiente)
3. [Verificações de Triggers](#verificações-de-triggers)
4. [Mapeamento de Campos](#mapeamento-de-campos)
5. [Estratégia de Resolução de Conflitos](#estratégia-de-resolução-de-conflitos)
6. [Troubleshooting](#troubleshooting)
7. [Plano de Validação](#plano-de-validação)

---

## Arquitetura de Dados e Fluxo

### Visão Geral

O sistema de sincronização conecta dois projetos Supabase independentes:

```
┌─────────────────────────────────────────────────────────────┐
│  TABULADORMAX (gkvvtfqfggddzotxltxf)                        │
│  Projeto: Origem dos Dados                                  │
│  ├─ Tabela: public.leads                                    │
│  ├─ Triggers: INSERT/UPDATE/DELETE                          │
│  └─ Extensão: pg_http (comunicação externa)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ SYNC
                    HTTP POST (webhook)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  GESTÃO SCOUTER (ngestyxtopvfeyenyvgt)                      │
│  Projeto: Aplicação Principal                               │
│  ├─ Tabela: public.fichas (207k+ registros)                │
│  ├─ Tabelas Auxiliares:                                     │
│  │  ├─ sync_logs (auditoria)                               │
│  │  └─ sync_status (monitoramento)                         │
│  └─ Edge Functions:                                         │
│     ├─ sync-tabulador (sincronização bidirecional, 5min)   │
│     └─ sync-health (health check)                          │
└─────────────────────────────────────────────────────────────┘
```

### Fluxos de Sincronização

#### 1. Sincronização em Tempo Real (Triggers)

- **Origem**: TabuladorMax (`public.leads`)
- **Destino**: Gestão Scouter (`public.leads`)
- **Mecanismo**: Triggers SQL + pg_http
- **Gatilho**: INSERT, UPDATE, DELETE em `leads`
- **Latência**: < 1 segundo

#### 2. Sincronização Bidirecional (Edge Function)

- **Frequência**: A cada 5 minutos (cron job)
- **Direção**: Ambos os sentidos
- **Conflitos**: Última modificação vence (`updated_at`)
- **Função**: `supabase/functions/sync-tabulador/index.ts`

#### 3. Migração Inicial (Script Manual)

- **Script**: `scripts/syncLeadsToFichas.ts`
- **Uso**: Primeira carga de dados
- **Execução**: `npm run migrate:leads`
- **Batch Size**: 1000 registros por lote

---

## Checklist de Ambiente

### ⚙️ Variáveis de Ambiente Obrigatórias

#### Arquivo `.env` (raiz do projeto)

```env
# ============================================================================
# GESTÃO SCOUTER (Aplicação Principal)
# ============================================================================
VITE_SUPABASE_PROJECT_ID=jstsrgyxrrlklnzgsihd
VITE_SUPABASE_URL=https://jstsrgyxrrlklnzgsihd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg

# ============================================================================
# TABULADORMAX (Fonte de Dados)
# ============================================================================
TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
TABULADOR_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ✅ Validações de Configuração

#### 1. URLs Corretas

```bash
# Verificar que URLs são diferentes
echo "Gestão: $VITE_SUPABASE_URL"
echo "Tabulador: $TABULADOR_URL"
# DEVEM ser diferentes! Caso contrário, indica configuração de projeto único
```

#### 2. Service Role Keys Válidas

```bash
# Service keys devem começar com eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
# e ser diferentes entre os projetos
```

#### 3. Permissões de Acesso

**TabuladorMax (leitura)**:

```sql
-- Executar no SQL Editor do TabuladorMax
SELECT COUNT(*) FROM public.leads;
-- Deve retornar contagem sem erro de permissão
```

**Gestão Scouter (escrita)**:

```sql
-- Executar no SQL Editor do Gestão Scouter
INSERT INTO public.fichas (id, nome, deleted)
VALUES ('__test_sync__', 'Test Sync', false)
ON CONFLICT (id) DO UPDATE SET nome = 'Test Sync Updated';

DELETE FROM public.fichas WHERE id = '__test_sync__';
-- Deve executar sem erro de permissão
```

### 🔐 Segurança

⚠️ **IMPORTANTE**:

- Service Role Keys devem ser usadas **APENAS** em ambiente servidor
- **NUNCA** exponha service keys no frontend (`VITE_*` apenas para URLs públicas)
- Scripts de sincronização (`syncLeadsToFichas.ts`, `syncDiagnostics.ts`) rodam em Node.js (servidor)
- Edge Functions no Supabase têm acesso a secrets via variáveis de ambiente

---

## Verificações de Triggers

### 📍 Localização

Os triggers devem estar instalados no projeto **TabuladorMax** (origem).

### 🔍 Consultas de Verificação

#### 1. Verificar se a Extensão HTTP está Habilitada

```sql
-- Executar no SQL Editor do TabuladorMax
SELECT * FROM pg_extension WHERE extname = 'http';
```

**Resultado Esperado**:

```
extname | extversion
--------|------------
http    | 1.6
```

**Se não encontrar**: Execute `CREATE EXTENSION IF NOT EXISTS http;`

#### 2. Verificar Triggers Instalados

```sql
-- Executar no SQL Editor do TabuladorMax
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled,
  tgtype,
  pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.leads'::regclass
  AND tgname LIKE '%sync%'
ORDER BY tgname;
```

**Resultado Esperado** (3 triggers):

```
trigger_name              | enabled | tgtype | definition
--------------------------|---------|--------|----------------------------------
trigger_sync_lead_delete  | O       | 9      | CREATE TRIGGER ... AFTER DELETE
trigger_sync_lead_insert  | O       | 5      | CREATE TRIGGER ... AFTER INSERT
trigger_sync_lead_update  | O       | 17     | CREATE TRIGGER ... AFTER UPDATE
```

- **enabled**: `O` = habilitado, `D` = desabilitado
- **tgtype**: tipo do trigger (INSERT=5, UPDATE=17, DELETE=9)

#### 3. Verificar Funções de Sincronização

```sql
-- Executar no SQL Editor do TabuladorMax
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname LIKE '%sync_lead%'
ORDER BY proname;
```

**Funções Esperadas**:

- `sync_lead_to_fichas_insert()`
- `sync_lead_to_fichas_update()`
- `sync_lead_to_fichas_delete()`

#### 4. Verificar Variáveis de Configuração

```sql
-- Executar no SQL Editor do TabuladorMax
SHOW app.gestao_scouter_url;
SHOW app.gestao_scouter_service_key;
```

**Se retornar vazio**: Execute:

```sql
ALTER DATABASE postgres SET app.gestao_scouter_url = 'https://ngestyxtopvfeyenyvgt.supabase.co';
ALTER DATABASE postgres SET app.gestao_scouter_service_key = 'sua_service_role_key_aqui';
SELECT pg_reload_conf();
```

### 🛠️ Instalação dos Triggers

Se os triggers não estiverem instalados, execute o script:

```bash
# Copiar conteúdo do arquivo e executar no SQL Editor do TabuladorMax
cat supabase/functions/trigger_sync_leads_to_fichas.sql
```

---

## Mapeamento de Campos

### Tabela de Mapeamento Completa

| Campo Lead (TabuladorMax) | Campo Ficha (Gestão) | Tipo Origem | Tipo Destino | Transformação          |
| ------------------------- | -------------------- | ----------- | ------------ | ---------------------- |
| `id`                      | `id`                 | number      | text         | `String(value)`        |
| `nome`                    | `nome`               | text        | text         | Direto                 |
| `telefone`                | `telefone`           | text        | text         | Direto                 |
| `email`                   | `email`              | text        | text         | Direto                 |
| `idade`                   | `idade`              | number      | text         | `String(value)`        |
| `projeto`                 | `projeto`            | text        | text         | Direto                 |
| `scouter`                 | `scouter`            | text        | text         | Direto                 |
| `supervisor`              | `supervisor`         | text        | text         | Direto                 |
| `localizacao`             | `localizacao`        | text        | text         | Direto                 |
| `latitude`                | `latitude`           | numeric     | numeric      | Direto                 |
| `longitude`               | `longitude`          | numeric     | numeric      | Direto                 |
| `local_da_abordagem`      | `local_da_abordagem` | text        | text         | Direto                 |
| `criado`                  | `criado`             | date/text   | text         | `normalizeDate()`      |
| `valor_ficha`             | `valor_ficha`        | numeric     | numeric      | Direto                 |
| `etapa`                   | `etapa`              | text        | text         | Direto                 |
| `ficha_confirmada`        | `ficha_confirmada`   | text        | text         | Direto                 |
| `foto`                    | `foto`               | text        | text         | Direto                 |
| `updated_at`              | `updated_at`         | timestamptz | timestamptz  | Mantido ou gerado      |
| **todos os campos**       | `raw`                | -           | jsonb        | `JSON.stringify(lead)` |
| -                         | `deleted`            | -           | boolean      | `false` (padrão)       |
| -                         | `sync_source`        | -           | text         | 'TabuladorMax'         |
| -                         | `last_synced_at`     | -           | timestamptz  | `new Date()`           |

### Função de Normalização (TypeScript)

```typescript
function normalizeDate(value: any): string | undefined {
  if (!value) return undefined;

  // Se já é string no formato YYYY-MM-DD
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Se é Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // Se é timestamp
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  console.warn(`Data inválida: ${value}`);
  return undefined;
}

function normalizeLeadToFicha(lead: Lead): Ficha {
  return {
    id: String(lead.id),
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    idade: lead.idade ? String(lead.idade) : undefined,
    projeto: lead.projeto,
    scouter: lead.scouter,
    supervisor: lead.supervisor,
    localizacao: lead.localizacao,
    latitude: lead.latitude,
    longitude: lead.longitude,
    local_da_abordagem: lead.local_da_abordagem,
    criado: normalizeDate(lead.criado),
    valor_ficha: lead.valor_ficha,
    etapa: lead.etapa,
    ficha_confirmada: lead.ficha_confirmada,
    foto: lead.foto,
    updated_at: lead.updated_at || new Date().toISOString(),
    raw: lead, // Backup JSON completo
    deleted: false,
    sync_source: 'TabuladorMax',
    last_synced_at: new Date().toISOString(),
  };
}
```

### Tipos Esperados em Fichas

```sql
-- Schema da tabela fichas (Gestão Scouter)
CREATE TABLE IF NOT EXISTS public.fichas (
  id TEXT PRIMARY KEY,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  idade TEXT,
  projeto TEXT,
  scouter TEXT,
  supervisor TEXT,
  localizacao TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  local_da_abordagem TEXT,
  criado TEXT,
  valor_ficha NUMERIC,
  etapa TEXT,
  ficha_confirmada TEXT,
  foto TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw JSONB,
  deleted BOOLEAN DEFAULT FALSE,
  sync_source TEXT DEFAULT 'Gestao',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices necessários
CREATE UNIQUE INDEX IF NOT EXISTS fichas_pkey ON fichas(id);
CREATE INDEX IF NOT EXISTS idx_fichas_updated_at ON fichas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fichas_last_synced ON fichas(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON fichas(sync_source);
CREATE INDEX IF NOT EXISTS idx_fichas_deleted ON fichas(deleted);
```

---

## Estratégia de Resolução de Conflitos

### Cenário: Mesmo Registro Modificado em Ambos os Projetos

```
┌─────────────────────────────────────────────────────────────┐
│  Conflito Detectado                                         │
│  ───────────────────────────────────────────────────────    │
│  ID: "12345"                                                │
│  TabuladorMax.updated_at: 2025-10-17 10:30:00              │
│  Gestão.updated_at:       2025-10-17 10:35:00              │
└─────────────────────────────────────────────────────────────┘
                          ↓
          Comparação de Timestamps (updated_at)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Resolução: Gestão Vence (10:35:00 > 10:30:00)             │
│  ─────────────────────────────────────────────────────────  │
│  Ação: Sincronizar Gestão → TabuladorMax                   │
│  Resultado: Dados do Gestão sobrescrevem TabuladorMax      │
└─────────────────────────────────────────────────────────────┘
```

### Regras de Conflito

1. **Comparação por `updated_at`**: O registro com timestamp mais recente vence
2. **Ambos com mesmo timestamp**: Prioriza Gestão Scouter (aplicação principal)
3. **Timestamp ausente**: Considera como mais antigo
4. **Registro deletado**: Flag `deleted=true` tem precedência

### Implementação na Edge Function

```typescript
// supabase/functions/sync-tabulador/index.ts
function resolveConflict(gestaoRecord: Ficha, tabuladorRecord: Lead): 'gestao' | 'tabulador' {
  const gestaoTime = new Date(gestaoRecord.updated_at || 0).getTime();
  const tabuladorTime = new Date(tabuladorRecord.updated_at || 0).getTime();

  if (gestaoTime > tabuladorTime) return 'gestao';
  if (tabuladorTime > gestaoTime) return 'tabulador';

  // Empate: prioriza Gestão (aplicação principal)
  return 'gestao';
}
```

### Requisitos de Timezone

⚠️ **IMPORTANTE**: Todos os timestamps devem estar em UTC:

```sql
-- Verificar timezone do banco
SHOW timezone;  -- Deve retornar 'UTC'

-- Garantir que updated_at sempre usa UTC
ALTER TABLE fichas
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE leads
  ALTER COLUMN updated_at SET DEFAULT NOW();
```

### Trigger de Updated_at

```sql
-- Criar função de atualização automática
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em fichas
DROP TRIGGER IF EXISTS set_updated_at ON fichas;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON fichas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Troubleshooting

### 🔴 Problema: Sincronização Não Acontece

#### Sintomas

- Dados novos no TabuladorMax não aparecem no Gestão
- Alterações no Gestão não propagam para TabuladorMax
- Tabela `sync_logs` sem registros recentes

#### Possíveis Causas e Correções

| Causa                          | Verificação                                                                         | Correção                                    |
| ------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| **Triggers não instalados**    | `SELECT * FROM pg_trigger WHERE tgrelid = 'public.leads'::regclass` no TabuladorMax | Executar `trigger_sync_leads_to_fichas.sql` |
| **Extensão HTTP desabilitada** | `SELECT * FROM pg_extension WHERE extname = 'http'`                                 | `CREATE EXTENSION IF NOT EXISTS http;`      |
| **URLs/Keys incorretas**       | Verificar variáveis `.env` e `app.gestao_scouter_*`                                 | Atualizar configurações                     |
| **Edge Function pausada**      | Dashboard Supabase → Edge Functions                                                 | Reativar função `sync-tabulador`            |
| **Cron job desabilitado**      | Dashboard Supabase → Database → Cron Jobs                                           | Habilitar cron de 5 minutos                 |
| **RLS bloqueando**             | `SELECT * FROM fichas LIMIT 1` com service key                                      | Ajustar policies ou usar service key        |

#### Checklist de Diagnóstico

```bash
# 1. Testar conectividade com ambos projetos
npm run diagnostics:sync

# 2. Testar escrita em fichas
npm run diagnostics:sync:write

# 3. Verificar logs de sync
# SQL Editor (Gestão Scouter):
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10;

# 4. Verificar status de sync
SELECT * FROM sync_status ORDER BY updated_at DESC;

# 5. Verificar Edge Function logs
# Dashboard → Edge Functions → sync-tabulador → Logs
```

---

### 🟡 Problema: Dados Inconsistentes

#### Sintomas

- Contagem de registros diferente entre projetos
- Campos com valores diferentes para mesmo ID
- Registros duplicados

#### Diagnóstico

```sql
-- Gestão Scouter: Contar fichas
SELECT COUNT(*) AS total_fichas FROM fichas WHERE deleted = false;

-- TabuladorMax: Contar leads
SELECT COUNT(*) AS total_leads FROM leads;

-- Gestão Scouter: Identificar registros sem sync recente
SELECT id, nome, updated_at, last_synced_at
FROM fichas
WHERE last_synced_at < updated_at
   OR last_synced_at IS NULL
ORDER BY updated_at DESC
LIMIT 100;

-- Gestão Scouter: Verificar conflitos potenciais
SELECT
  id,
  nome,
  updated_at,
  sync_source,
  last_synced_at
FROM fichas
WHERE updated_at > (NOW() - INTERVAL '1 hour')
  AND sync_source = 'Gestao'
ORDER BY updated_at DESC;
```

#### Correções

1. **Re-sincronização Completa**:

   ```bash
   npm run migrate:leads
   ```

2. **Forçar Sync Manual**:

   ```bash
   # Invocar Edge Function manualmente
   curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/sync-tabulador \
     -H "Authorization: Bearer $VITE_SUPABASE_SERVICE_KEY"
   ```

3. **Limpar Duplicatas**:

   ```sql
   -- Identificar duplicatas
   SELECT id, COUNT(*)
   FROM fichas
   GROUP BY id
   HAVING COUNT(*) > 1;

   -- Se houver duplicatas, manter apenas o mais recente
   DELETE FROM fichas a
   USING fichas b
   WHERE a.id = b.id
     AND a.created_at < b.created_at;
   ```

---

### 🟢 Problema: Performance Degradada

#### Sintomas

- Sincronização demora mais de 30 segundos
- Timeouts na Edge Function
- CPU/memória alta no Supabase

#### Diagnóstico

```sql
-- Verificar quantidade de registros pendentes
SELECT COUNT(*)
FROM fichas
WHERE updated_at > (NOW() - INTERVAL '5 minutes');

-- Verificar índices
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'fichas';

-- Verificar tamanho da tabela
SELECT
  pg_size_pretty(pg_total_relation_size('fichas')) AS size;
```

#### Correções

1. **Adicionar/Recriar Índices**:

   ```sql
   -- Recriar índice de updated_at
   DROP INDEX IF EXISTS idx_fichas_updated_at;
   CREATE INDEX idx_fichas_updated_at ON fichas(updated_at DESC);

   -- Analisar tabela
   ANALYZE fichas;
   ```

2. **Aumentar Batch Size na Edge Function**:

   ```typescript
   // supabase/functions/sync-tabulador/index.ts
   const BATCH_SIZE = 500; // Reduzir para 500 se estiver muito lento
   ```

3. **Otimizar Queries**:
   ```sql
   -- Usar LIMIT nas queries de sincronização
   SELECT * FROM fichas
   WHERE updated_at > $lastSync
   ORDER BY updated_at ASC
   LIMIT 1000;
   ```

---

## Plano de Validação

### 📝 Checklist de Migração Inicial

#### Pré-Migração

- [ ] Backup do banco de dados (ambos projetos)
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] Service role keys válidas
- [ ] Tabela `fichas` existe no Gestão Scouter
- [ ] Tabela `leads` tem registros no TabuladorMax
- [ ] Dependências instaladas (`npm install`)

#### Durante Migração

- [ ] Executar `npm run migrate:leads`
- [ ] Monitorar progresso no terminal
- [ ] Verificar taxa de processamento (> 1000 reg/s)
- [ ] Aguardar conclusão sem erros

#### Pós-Migração

- [ ] Verificar contagem de registros

  ```sql
  -- TabuladorMax
  SELECT COUNT(*) FROM leads;

  -- Gestão Scouter
  SELECT COUNT(*) FROM fichas WHERE deleted = false;
  ```

- [ ] Validar integridade de dados

  ```sql
  -- Verificar campos obrigatórios preenchidos
  SELECT COUNT(*) FROM fichas WHERE nome IS NULL;
  SELECT COUNT(*) FROM fichas WHERE id IS NULL;
  ```

- [ ] Testar queries da aplicação

  ```sql
  -- Queries comuns do dashboard
  SELECT projeto, COUNT(*) FROM fichas GROUP BY projeto;
  SELECT scouter, COUNT(*) FROM fichas GROUP BY scouter;
  ```

- [ ] Validar backup JSON
  ```sql
  -- Verificar campo raw
  SELECT id, nome, raw->'email' as email_backup
  FROM fichas
  LIMIT 5;
  ```

### 🔬 Checagens Pós-Execução

#### 1. Testes de Conectividade

```bash
# Executar diagnóstico completo
npm run diagnostics:sync

# Saída esperada:
# ✅ PASS: Configuração de variáveis
# ✅ PASS: Conexão com TabuladorMax (leitura)
# ✅ PASS: Conexão com Gestão Scouter (escrita)
# ✅ PASS: Amostragem de dados (dry-run)
```

#### 2. Verificação de Triggers

```sql
-- Executar no TabuladorMax
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.leads'::regclass
  AND tgname LIKE '%sync%';

-- Deve retornar 3 triggers habilitados
```

#### 3. Teste de Sincronização em Tempo Real

```sql
-- 1. Inserir novo lead no TabuladorMax
INSERT INTO public.leads (nome, telefone, projeto)
VALUES ('Test Sync', '11999999999', 'Teste');

-- 2. Aguardar 2-3 segundos

-- 3. Verificar no Gestão Scouter
SELECT * FROM public.fichas
WHERE nome = 'Test Sync'
ORDER BY created_at DESC
LIMIT 1;

-- Deve retornar o registro recém-criado

-- 4. Limpar teste
DELETE FROM public.leads WHERE nome = 'Test Sync';
```

#### 4. Queries de Auditoria

```sql
-- Gestão Scouter: Últimas sincronizações
SELECT
  id,
  sync_direction,
  records_synced,
  records_failed,
  processing_time_ms,
  started_at,
  completed_at
FROM sync_logs
ORDER BY started_at DESC
LIMIT 20;

-- Gestão Scouter: Status de saúde
SELECT
  project_name,
  last_sync_at,
  last_sync_success,
  total_records,
  last_error,
  updated_at
FROM sync_status
ORDER BY updated_at DESC;

-- Gestão Scouter: Registros modificados recentemente
SELECT
  id,
  nome,
  projeto,
  scouter,
  updated_at,
  sync_source,
  last_synced_at
FROM fichas
WHERE updated_at > (NOW() - INTERVAL '1 hour')
ORDER BY updated_at DESC
LIMIT 50;

-- Gestão Scouter: Distribuição por fonte de sync
SELECT
  sync_source,
  COUNT(*) as total,
  MIN(last_synced_at) as oldest_sync,
  MAX(last_synced_at) as newest_sync
FROM fichas
GROUP BY sync_source;
```

---

## 📚 Documentação Relacionada

- [README Principal](../README.md) - Visão geral do projeto
- [SYNC_DIAGNOSTICS.md](./SYNC_DIAGNOSTICS.md) - Guia do script de diagnóstico
- [SYNC_ARCHITECTURE.md](../SYNC_ARCHITECTURE.md) - Arquitetura detalhada
- [scripts/README.md](../scripts/README.md) - Documentação dos scripts

---

## 📞 Suporte

Para questões sobre sincronização:

1. Consulte a seção [Troubleshooting](#troubleshooting)
2. Execute o [script de diagnóstico](./SYNC_DIAGNOSTICS.md)
3. Verifique os logs do Supabase Dashboard
4. Abra uma issue no GitHub com os resultados do diagnóstico

---

**Última Atualização**: 2025-10-17  
**Versão**: 1.0.0
