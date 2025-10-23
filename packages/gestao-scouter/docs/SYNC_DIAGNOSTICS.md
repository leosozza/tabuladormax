# Guia de Diagnóstico de Sincronização

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [Uso do Script](#uso-do-script)
5. [Testes Executados](#testes-executados)
6. [Consultas SQL Úteis](#consultas-sql-úteis)
7. [Interpretação de Resultados](#interpretação-de-resultados)
8. [Ações Recomendadas](#ações-recomendadas)

---

## Visão Geral

O script `syncDiagnostics.ts` é uma ferramenta de diagnóstico automatizado que valida:
- ✅ Configuração de variáveis de ambiente
- ✅ Conectividade com ambos os projetos Supabase
- ✅ Permissões de leitura (TabuladorMax)
- ✅ Permissões de escrita (Gestão Scouter)
- ✅ Integridade do mapeamento de dados
- ✅ Simulação de sincronização (dry-run)

### Quando Usar

- **Primeira configuração**: Validar setup inicial
- **Troubleshooting**: Diagnosticar problemas de sincronização
- **Pré-produção**: Verificar antes de deploy
- **Monitoramento**: Executar periodicamente para validar saúde

---

## Pré-requisitos

### 1. Node.js e Dependências

```bash
# Node.js 18+ instalado
node --version  # Deve ser >= 18.0.0

# Dependências instaladas
npm install
```

### 2. Variáveis de Ambiente

Arquivo `.env` na raiz do projeto com:

```env
# Gestão Scouter (destino)
VITE_SUPABASE_URL=https://ngestyxtopvfeyenyvgt.supabase.co
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TabuladorMax (origem)
TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
TABULADOR_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE**: Use **service role keys**, não publishable keys!

### 3. Permissões no Supabase

- **TabuladorMax**: Service role key com acesso de LEITURA a `public.leads`
- **Gestão Scouter**: Service role key com acesso de ESCRITA a `public.fichas`

---

## Instalação e Configuração

### Passo 1: Clonar e Instalar

```bash
git clone https://github.com/leosozza/gestao-scouter.git
cd gestao-scouter
npm install
```

### Passo 2: Configurar Variáveis

```bash
# Copiar exemplo
cp .env.example .env

# Editar com suas credenciais
nano .env  # ou seu editor preferido
```

### Passo 3: Verificar Instalação

```bash
# Testar que o script existe
ls -la scripts/syncDiagnostics.ts

# Verificar sintaxe TypeScript
npx tsx --check scripts/syncDiagnostics.ts
```

---

## Uso do Script

### Comandos Disponíveis

#### 1. Diagnóstico Completo (Dry-Run)

```bash
npm run diagnostics:sync
```

**O que faz**:
- ✅ Valida variáveis de ambiente
- ✅ Testa conexão com TabuladorMax (leitura)
- ✅ Testa conexão com Gestão Scouter (leitura)
- ✅ Busca amostra de até 10 leads
- ✅ Normaliza dados (dry-run, sem gravar)
- ✅ Exibe preview do payload de sincronização
- ❌ **NÃO grava dados** (modo seguro)

**Saída esperada**:
```
🔍 DIAGNÓSTICO DE SINCRONIZAÇÃO
================================================================================

[1/5] Validando Variáveis de Ambiente...
  ✅ TABULADOR_URL: https://gkvvtfqfggddzotxltxf.supabase.co
  ✅ TABULADOR_SERVICE_KEY: eyJhbG... (válida)
  ✅ VITE_SUPABASE_URL: https://ngestyxtopvfeyenyvgt.supabase.co
  ✅ VITE_SUPABASE_SERVICE_KEY: eyJhbG... (válida)

[2/5] Testando Leitura em TabuladorMax (public.leads)...
  ✅ Conexão bem-sucedida
  ✅ Leitura autorizada
  📊 Total de leads: 207000
  ⏱️ Latência: 145ms

[3/5] Testando Leitura em Gestão Scouter (public.fichas)...
  ✅ Conexão bem-sucedida
  ✅ Leitura autorizada
  📊 Total de fichas: 207000
  ⏱️ Latência: 98ms

[4/5] Buscando Amostra de Leads (10 registros)...
  ✅ 10 leads recuperados com sucesso
  
[5/5] Normalizando Dados (Dry-Run)...
  ✅ 10/10 registros normalizados com sucesso
  
📋 PREVIEW DE PAYLOAD (primeiros 3 registros):
{
  "id": "12345",
  "nome": "João Silva",
  "telefone": "(11) 98765-4321",
  "email": "joao@email.com",
  "projeto": "Projeto A",
  "scouter": "Maria",
  "criado": "2025-01-15",
  "updated_at": "2025-10-17T10:30:00.000Z",
  "deleted": false,
  "sync_source": "TabuladorMax"
}
...

================================================================================
✅ DIAGNÓSTICO CONCLUÍDO COM SUCESSO

📊 Resumo:
  - Configuração: ✅ PASS
  - Leitura TabuladorMax: ✅ PASS
  - Leitura Gestão: ✅ PASS
  - Escrita Gestão: ⏭️ SKIPPED (use --write-check)
  - Normalização: ✅ PASS (10/10)
  
💡 Próximos Passos:
  1. Execute com --write-check para testar escrita
  2. Execute npm run migrate:leads para sincronização completa
  3. Configure triggers para sincronização em tempo real

Código de Saída: 0 (sucesso)
```

#### 2. Diagnóstico com Teste de Escrita

```bash
npm run diagnostics:sync:write
```

**O que faz**:
- ✅ Tudo do modo dry-run
- ✅ **Testa escrita** em `public.fichas`
- ✅ Insere registro sintético `id='__diagnostic_sync__'`
- ✅ Verifica se upsert funcionou
- ✅ Remove registro sintético (cleanup)

**Saída adicional**:
```
[Extra] Testando Escrita em Gestão Scouter (public.fichas)...
  ✅ Inserção bem-sucedida (upsert)
  ✅ Registro sintético criado: __diagnostic_sync__
  ✅ Verificação: registro encontrado
  ✅ Limpeza: registro removido
  ⏱️ Latência total: 234ms
```

#### 3. Diagnóstico com Amostra Customizada

```bash
# Testar com 50 registros
npx tsx scripts/syncDiagnostics.ts --sample 50

# Testar com 100 registros e escrita
npx tsx scripts/syncDiagnostics.ts --sample 100 --write-check
```

### Flags Disponíveis

| Flag | Valor Padrão | Descrição |
|------|--------------|-----------|
| `--dry-run` | `true` | Apenas simula, não grava dados |
| `--write-check` | `false` | Habilita teste de escrita com cleanup |
| `--sample N` | `10` | Número de registros para amostragem |
| `--verbose` | `false` | Exibe logs detalhados |
| `--help` | - | Mostra ajuda |

### Códigos de Saída

| Código | Significado | Ação |
|--------|-------------|------|
| `0` | ✅ Sucesso total | Tudo OK, prosseguir |
| `1` | ⚠️ Warnings | Revisar avisos, mas pode prosseguir |
| `2` | ❌ Erro fatal | Corrigir problemas antes de prosseguir |

---

## Testes Executados

### 1. Validação de Variáveis Obrigatórias

**O que verifica**:
```typescript
const required = [
  'TABULADOR_URL',
  'TABULADOR_SERVICE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_SERVICE_KEY'
];
```

**Possíveis erros**:
- ❌ Variável não definida
- ❌ URL inválida (não começa com https://)
- ❌ Service key inválida (formato JWT incorreto)
- ❌ URLs iguais (mesmo projeto configurado duas vezes)

**Como corrigir**:
```bash
# Editar .env
nano .env

# Verificar
cat .env | grep -E "(TABULADOR|VITE_SUPABASE)"
```

### 2. Health Check de Leitura (TabuladorMax)

**Query executada**:
```sql
SELECT id, nome, telefone, email, projeto, scouter, created_at
FROM public.leads
ORDER BY created_at DESC
LIMIT 1;
```

**O que verifica**:
- ✅ Conexão estabelecida
- ✅ Autenticação aceita
- ✅ Permissão de SELECT
- ✅ Tabela `leads` existe
- ✅ Latência < 1000ms

**Possíveis erros**:
- ❌ `Connection refused`: URL incorreta ou projeto offline
- ❌ `Invalid JWT`: Service key incorreta
- ❌ `Permission denied`: RLS bloqueando acesso
- ❌ `Table not found`: Tabela `leads` não existe

### 3. Health Check de Leitura (Gestão Scouter)

**Query executada**:
```sql
SELECT id, nome, telefone, email, projeto, scouter, created_at
FROM public.fichas
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 1;
```

**Validações**:
- ✅ Conexão e autenticação
- ✅ Permissão de leitura
- ✅ Contagem de registros

### 4. Health Check de Escrita (Gestão Scouter)

**Operação executada**:
```typescript
// 1. Upsert registro sintético
await supabase.from('fichas').upsert({
  id: '__diagnostic_sync__',
  nome: 'Test Sync Diagnostic',
  deleted: false,
  sync_source: 'diagnostics',
  updated_at: new Date().toISOString()
});

// 2. Verificar se foi criado
const { data } = await supabase
  .from('fichas')
  .select('id')
  .eq('id', '__diagnostic_sync__')
  .single();

// 3. Remover (cleanup)
await supabase
  .from('fichas')
  .delete()
  .eq('id', '__diagnostic_sync__');
```

**O que valida**:
- ✅ Permissão de INSERT
- ✅ Permissão de UPDATE (upsert)
- ✅ Permissão de DELETE
- ✅ Constraints e triggers funcionando
- ✅ Índices existem (performance)

**Possíveis erros**:
- ❌ `Permission denied for INSERT`: RLS bloqueando escrita
- ❌ `Unique constraint violation`: ID já existe (não deveria)
- ❌ `Trigger error`: Trigger de updated_at com problema

### 5. Amostragem e Normalização (Dry-Run)

**O que faz**:
```typescript
// 1. Buscar amostra
const leads = await tabuladorClient
  .from('leads')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(sampleSize);

// 2. Normalizar cada lead
const normalized = leads.map(lead => normalizeLeadToFicha(lead));

// 3. Validar estrutura
normalized.forEach(ficha => {
  assert(ficha.id, 'ID é obrigatório');
  assert(ficha.nome, 'Nome é obrigatório');
  assert(ficha.criado, 'Data de criação é obrigatória');
  // ...
});

// 4. Preview (não grava)
console.log('Preview:', JSON.stringify(normalized.slice(0, 3), null, 2));
```

**Validações**:
- ✅ Conversão de tipos (number → string para ID/idade)
- ✅ Normalização de datas (ISO → YYYY-MM-DD)
- ✅ Backup JSON completo no campo `raw`
- ✅ Campos obrigatórios preenchidos
- ✅ Estrutura compatível com schema de `fichas`

**Warnings comuns**:
- ⚠️ `Data inválida`: Lead com campo `criado` em formato desconhecido
- ⚠️ `Email inválido`: Formato de email não padrão
- ⚠️ `Telefone mal formatado`: Telefone sem máscara ou incompleto

---

## Consultas SQL Úteis

### Verificação de Triggers (TabuladorMax)

```sql
-- 1. Listar triggers de sincronização
SELECT 
  tgname AS trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'Habilitado'
    WHEN 'D' THEN 'Desabilitado'
    ELSE 'Outro'
  END AS status,
  CASE 
    WHEN tgtype & 4 = 4 THEN 'INSERT'
    WHEN tgtype & 16 = 16 THEN 'UPDATE'
    WHEN tgtype & 8 = 8 THEN 'DELETE'
  END AS event_type,
  pg_get_triggerdef(oid) AS definition
FROM pg_trigger 
WHERE tgrelid = 'public.leads'::regclass
  AND tgname LIKE '%sync%'
ORDER BY tgname;
```

### Status de Sincronização (Gestão Scouter)

```sql
-- Status atual da sincronização
SELECT 
  project_name,
  last_sync_at,
  last_sync_success,
  total_records,
  CASE 
    WHEN last_error IS NOT NULL THEN '❌ Com Erros'
    WHEN last_sync_success THEN '✅ OK'
    ELSE '⚠️ Desconhecido'
  END AS health_status,
  last_error,
  AGE(NOW(), updated_at) AS time_since_update
FROM sync_status
ORDER BY updated_at DESC;
```

### Últimas Execuções (Gestão Scouter)

```sql
-- Histórico de sincronizações
SELECT 
  id,
  sync_direction,
  records_synced,
  records_failed,
  ROUND(processing_time_ms / 1000.0, 2) AS seconds,
  started_at,
  completed_at,
  CASE 
    WHEN records_failed = 0 THEN '✅'
    WHEN records_failed < records_synced * 0.05 THEN '⚠️'
    ELSE '❌'
  END AS status
FROM sync_logs
ORDER BY started_at DESC
LIMIT 20;
```

### Contagens Amostradas (Ambos)

```sql
-- TabuladorMax
SELECT 
  'TabuladorMax' AS projeto,
  COUNT(*) AS total_registros,
  COUNT(DISTINCT projeto) AS total_projetos,
  COUNT(DISTINCT scouter) AS total_scouters,
  MIN(created_at) AS registro_mais_antigo,
  MAX(created_at) AS registro_mais_recente
FROM public.leads;

-- Gestão Scouter
SELECT 
  'Gestão Scouter' AS projeto,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE deleted = false) AS registros_ativos,
  COUNT(*) FILTER (WHERE deleted = true) AS registros_deletados,
  COUNT(DISTINCT projeto) AS total_projetos,
  COUNT(DISTINCT scouter) AS total_scouters,
  MIN(created_at) AS registro_mais_antigo,
  MAX(created_at) AS registro_mais_recente
FROM public.fichas;
```

### Registros Desatualizados (Gestão Scouter)

```sql
-- Fichas que não foram sincronizadas recentemente
SELECT 
  id,
  nome,
  projeto,
  scouter,
  updated_at,
  last_synced_at,
  AGE(NOW(), last_synced_at) AS tempo_sem_sync,
  sync_source
FROM fichas
WHERE 
  (last_synced_at IS NULL OR last_synced_at < updated_at)
  AND deleted = false
ORDER BY updated_at DESC
LIMIT 100;
```

### Análise de Performance (Gestão Scouter)

```sql
-- Performance média das sincronizações
SELECT 
  sync_direction,
  COUNT(*) AS total_execucoes,
  AVG(records_synced) AS media_registros,
  AVG(processing_time_ms) AS media_tempo_ms,
  MIN(processing_time_ms) AS min_tempo_ms,
  MAX(processing_time_ms) AS max_tempo_ms,
  SUM(records_failed) AS total_falhas
FROM sync_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY sync_direction
ORDER BY sync_direction;
```

---

## Interpretação de Resultados

### ✅ Tudo OK (Exit Code 0)

**Saída**:
```
✅ DIAGNÓSTICO CONCLUÍDO COM SUCESSO
Código de Saída: 0
```

**Significa**:
- ✅ Configuração correta
- ✅ Conectividade OK
- ✅ Permissões adequadas
- ✅ Normalização funciona
- ✅ Pronto para sincronização

**Próximos passos**:
1. Executar migração inicial: `npm run migrate:leads`
2. Configurar triggers em tempo real
3. Monitorar sync_logs periodicamente

---

### ⚠️ Warnings (Exit Code 1)

**Saída**:
```
⚠️ DIAGNÓSTICO CONCLUÍDO COM AVISOS
Warnings: 3
Código de Saída: 1
```

**Exemplos de warnings**:
- ⚠️ Latência alta (> 500ms)
- ⚠️ Poucos registros encontrados
- ⚠️ Alguns campos com valores inesperados
- ⚠️ Triggers não instalados (mas sincronização via Edge Function OK)

**O que fazer**:
1. Revisar warnings específicos
2. Avaliar impacto (crítico ou não)
3. Se não crítico, pode prosseguir
4. Se crítico, corrigir antes de produção

---

### ❌ Erro Fatal (Exit Code 2)

**Saída**:
```
❌ DIAGNÓSTICO FALHOU
Erros Fatais: 2
Código de Saída: 2
```

**Exemplos de erros fatais**:
- ❌ Variável de ambiente faltando
- ❌ Não consegue conectar ao Supabase
- ❌ Permissão negada (RLS bloqueando)
- ❌ Tabela não existe
- ❌ Service key inválida

**O que fazer**:
1. **NÃO prosseguir** com sincronização
2. Ler mensagem de erro detalhada
3. Corrigir problema (ver seção [Ações Recomendadas](#ações-recomendadas))
4. Executar diagnóstico novamente
5. Só prosseguir quando exit code = 0

---

## Ações Recomendadas

### Para Exit Code 0 (Sucesso)

```bash
# 1. Executar migração inicial (se fichas estiver vazia)
npm run migrate:leads

# 2. Configurar triggers (se ainda não configurado)
# Executar no SQL Editor do TabuladorMax:
cat supabase/functions/trigger_sync_leads_to_fichas.sql

# 3. Habilitar Edge Function de sync
# Dashboard Supabase → Edge Functions → sync-tabulador → Enable

# 4. Deploy Edge Function de health
supabase functions deploy sync-health

# 5. Monitoramento contínuo
# Agendar execução diária do diagnóstico:
crontab -e
# Adicionar:
# 0 8 * * * cd /path/to/gestao-scouter && npm run diagnostics:sync >> /var/log/sync-diagnostics.log 2>&1
```

### Para Exit Code 1 (Warnings)

```bash
# 1. Revisar warnings específicos
npm run diagnostics:sync 2>&1 | grep "⚠️"

# 2. Se warning de latência alta
# Verificar conexão de rede
ping gkvvtfqfggddzotxltxf.supabase.co
ping ngestyxtopvfeyenyvgt.supabase.co

# 3. Se warning de poucos registros
# Verificar se tabela tem dados
# SQL Editor (TabuladorMax):
SELECT COUNT(*) FROM leads;

# 4. Se warning de triggers não instalados
# Instalar triggers
# Executar trigger_sync_leads_to_fichas.sql no TabuladorMax

# 5. Avaliar se pode prosseguir
# Se warnings não são críticos, continuar
npm run migrate:leads
```

### Para Exit Code 2 (Erro Fatal)

#### Erro: "TABULADOR_URL não configurada"

```bash
# Verificar se .env existe
ls -la .env

# Se não existir, criar
cp .env.example .env

# Editar e adicionar variáveis
nano .env
```

#### Erro: "Connection refused"

```bash
# Verificar URL
echo $TABULADOR_URL
echo $VITE_SUPABASE_URL

# Testar conectividade
curl -I https://gkvvtfqfggddzotxltxf.supabase.co
curl -I https://ngestyxtopvfeyenyvgt.supabase.co

# Se não responder, verificar:
# 1. Projeto está ativo no Supabase Dashboard?
# 2. URL está correta (copiar do dashboard)?
```

#### Erro: "Invalid JWT" ou "Authentication failed"

```bash
# Service keys têm formato específico
# Devem começar com: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9

# Verificar comprimento (deve ser longa)
echo $TABULADOR_SERVICE_KEY | wc -c
# Deve ser > 200 caracteres

# Copiar novamente do Supabase Dashboard
# Project Settings → API → service_role key (secret)
```

#### Erro: "Permission denied for relation leads"

```sql
-- Executar no SQL Editor do TabuladorMax
-- Verificar RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'leads';

-- Se RLS estiver habilitado (rowsecurity = true)
-- Garantir que service role bypassa RLS (padrão)
-- Ou criar policy específica:

CREATE POLICY "Allow service role full access"
ON public.leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### Erro: "Table 'fichas' does not exist"

```sql
-- Executar no SQL Editor do Gestão Scouter
-- Criar tabela fichas
-- Usar migration existente:
-- supabase/migrations/20250929_create_fichas.sql

-- Ou criar manualmente:
CREATE TABLE IF NOT EXISTS public.fichas (
  id TEXT PRIMARY KEY,
  nome TEXT,
  telefone TEXT,
  email TEXT,
  -- ... (ver schema completo em ANALISE_SYNC_TABULADOR.md)
);
```

---

## 📊 Exemplo de Execução Completa

```bash
$ npm run diagnostics:sync

> gestao-scouter@1.0.0 diagnostics:sync
> tsx scripts/syncDiagnostics.ts --dry-run

🔍 DIAGNÓSTICO DE SINCRONIZAÇÃO
================================================================================

[1/5] Validando Variáveis de Ambiente...
  ✅ TABULADOR_URL: https://gkvvtfqfggddzotxltxf.supabase.co
  ✅ TABULADOR_SERVICE_KEY: eyJhbG... (válida, 247 caracteres)
  ✅ VITE_SUPABASE_URL: https://ngestyxtopvfeyenyvgt.supabase.co
  ✅ VITE_SUPABASE_SERVICE_KEY: eyJhbG... (válida, 251 caracteres)
  ✅ URLs diferentes (projetos separados confirmados)

[2/5] Testando Leitura em TabuladorMax (public.leads)...
  ✅ Conexão estabelecida
  ✅ Autenticação aceita
  ✅ Permissão de SELECT confirmada
  📊 Total de leads: 207458
  ⏱️ Latência: 142ms
  
[3/5] Testando Leitura em Gestão Scouter (public.fichas)...
  ✅ Conexão estabelecida
  ✅ Autenticação aceita
  ✅ Permissão de SELECT confirmada
  📊 Total de fichas: 207000 (ativos)
  📊 Total deletados: 0
  ⏱️ Latência: 95ms

[4/5] Buscando Amostra de Leads (10 registros)...
  ✅ 10 leads recuperados com sucesso
  📊 Distribuição:
     - Projeto A: 4 registros
     - Projeto B: 3 registros
     - Projeto C: 3 registros
  
[5/5] Normalizando Dados (Dry-Run)...
  ✅ 10/10 registros normalizados sem erros
  ⚠️ 1 warning: Data em formato inválido (convertida com fallback)
  
📋 PREVIEW DE PAYLOAD (primeiros 2 registros):

[1] Lead ID: 12345
{
  "id": "12345",
  "nome": "João Silva",
  "telefone": "(11) 98765-4321",
  "email": "joao@email.com",
  "idade": "25",
  "projeto": "Projeto A",
  "scouter": "Maria Santos",
  "criado": "2025-01-15",
  "updated_at": "2025-10-17T10:30:00.000Z",
  "deleted": false,
  "sync_source": "TabuladorMax",
  "raw": { ... }
}

[2] Lead ID: 12346
{
  "id": "12346",
  "nome": "Maria Oliveira",
  "telefone": "(11) 91234-5678",
  "email": "maria@email.com",
  "idade": "30",
  "projeto": "Projeto B",
  "scouter": "Pedro Lima",
  "criado": "2025-01-16",
  "updated_at": "2025-10-17T11:15:00.000Z",
  "deleted": false,
  "sync_source": "TabuladorMax",
  "raw": { ... }
}

================================================================================
✅ DIAGNÓSTICO CONCLUÍDO COM SUCESSO

📊 Resumo Final:
  - Configuração: ✅ PASS
  - Leitura TabuladorMax: ✅ PASS (207458 registros)
  - Leitura Gestão: ✅ PASS (207000 registros)
  - Escrita Gestão: ⏭️ SKIPPED (use --write-check para testar)
  - Normalização: ✅ PASS (10/10 registros)
  
  Warnings: 1
  Erros: 0
  
💡 Próximos Passos:
  1. ✅ Configuração validada! Sistema pronto para sincronização.
  2. Execute 'npm run diagnostics:sync:write' para testar escrita
  3. Execute 'npm run migrate:leads' para sincronização inicial completa
  4. Configure triggers para sincronização em tempo real
  5. Monitore sync_logs e sync_status periodicamente

📚 Documentação:
  - Análise Completa: docs/ANALISE_SYNC_TABULADOR.md
  - Guia de Diagnóstico: docs/SYNC_DIAGNOSTICS.md
  - Scripts: scripts/README.md

Código de Saída: 0 (sucesso)
================================================================================
```

---

## 📚 Documentação Relacionada

- [ANALISE_SYNC_TABULADOR.md](./ANALISE_SYNC_TABULADOR.md) - Análise completa de sincronização
- [README Principal](../README.md) - Visão geral do projeto
- [scripts/README.md](../scripts/README.md) - Documentação de scripts

---

**Última Atualização**: 2025-10-17  
**Versão**: 1.0.0
