# Arquitetura de Dados - Gestão Scouter

## 📋 Visão Geral

Este documento descreve a arquitetura atual de dados após a migração de Google Sheets para Supabase com sincronização bidirecional com TabuladorMax.

## 🏗️ Arquitetura Atual

```
┌─────────────────────────────────┐
│   Aplicação Web (React)         │
│   - Dashboard                   │
│   - Leads Management            │
│   - Projections                 │
│   - Geographic Heatmap          │
└────────────┬────────────────────┘
             │
             │ Queries via Supabase Client
             │
┌────────────▼────────────────────┐
│   SUPABASE LOCAL                │
│   (Fonte Única de Verdade)      │
│                                 │
│   Tabela Principal:             │
│   ├─ fichas (PRIMARY)           │ ← Todos os dados da aplicação
│   │  ├─ id                      │
│   │  ├─ criado                  │
│   │  ├─ created_at              │
│   │  ├─ scouter                 │
│   │  ├─ projeto                 │
│   │  └─ ...                     │
│   │                             │
│   Tabelas Auxiliares:           │
│   ├─ scouters                   │
│   ├─ sync_queue                 │
│   └─ tabulador_config           │
│                                 │
│   Edge Functions:               │
│   ├─ sync-tabulador             │ ← Sincronização bidirecional
│   ├─ process-sync-queue         │
│   └─ webhook-receiver            │
└────────────┬────────────────────┘
             │
             │ Bidirectional Sync
             │ (HTTP API + Webhooks)
             │
┌────────────▼────────────────────┐
│   TABULADORMAX (EXTERNO)        │
│   Database: PostgreSQL          │
│                                 │
│   Tabela Principal:             │
│   └─ leads                      │ ← Tabela externa sincronizada
│      ├─ id                      │
│      ├─ criado                  │
│      ├─ scouter                 │
│      └─ ...                     │
└─────────────────────────────────┘
```

## 🗃️ Tabelas e Uso

### Tabela Principal: `fichas` (Supabase LOCAL)

**Status:** ✅ ATIVA - Fonte única de verdade  
**Localização:** Supabase do projeto Gestão Scouter  
**Uso:** Todas as operações CRUD da aplicação

**Colunas Principais:**
- `id` - Identificador único (text)
- `criado` - Data de criação (date)
- `created_at` - Timestamp de criação (timestamptz)
- `scouter` - Nome do scouter (text)
- `projeto` - Nome do projeto (text)
- `valor_ficha` - Valor da ficha (numeric)
- `deleted` - Flag de exclusão lógica (boolean)
- `raw` - Dados brutos completos (jsonb)

**Sincronização:**
- Sincroniza bidirecionalmente com TabuladorMax `leads`
- Mudanças locais são enviadas para TabuladorMax
- Mudanças no TabuladorMax são recebidas aqui

### Tabela Externa: `leads` (TabuladorMax)

**Status:** ✅ ATIVA - Banco externo  
**Localização:** TabuladorMax (Supabase separado)  
**Uso:** Sincronização bidirecional APENAS

**Importante:**
- Esta tabela pertence ao banco de dados TabuladorMax
- NÃO confundir com a tabela `leads` local (deprecated)
- Acesso via configuração em `tabulador_config`
- Usado apenas por Edge Functions para sync

### Tabelas Legacy (DEPRECATED)

#### ❌ `leads` (Supabase LOCAL - DEPRECATED)
**Status:** DEPRECATED - Não usar  
**Motivo:** Substituída por `fichas`  
**Ação:** Remover referências no código

#### ❌ `bitrix_leads` (Supabase LOCAL - DEPRECATED)
**Status:** DEPRECATED - Apenas histórico  
**Motivo:** Migração do Bitrix descontinuada  
**Ação:** Manter para referência histórica, não usar

#### ❌ Google Sheets
**Status:** DEPRECATED - Não usar  
**Motivo:** Migrado para Supabase  
**Ação:** Remover todas as referências de código

## 🔄 Fluxo de Sincronização

### 1. Criação de Ficha na Aplicação

```
1. Usuário cria ficha na UI
   ↓
2. POST para Supabase LOCAL
   ↓
3. Inserção na tabela 'fichas'
   ↓
4. Trigger/Edge Function detecta mudança
   ↓
5. Envia para TabuladorMax 'leads'
   ↓
6. Confirmação de sync
```

### 2. Atualização no TabuladorMax

```
1. Sistema externo atualiza TabuladorMax 'leads'
   ↓
2. Webhook notifica Supabase LOCAL
   ↓
3. Edge Function 'webhook-receiver' processa
   ↓
4. Adiciona à 'sync_queue'
   ↓
5. 'process-sync-queue' atualiza 'fichas'
   ↓
6. Aplicação recebe dados atualizados
```

## 📁 Estrutura de Código

### Repositórios (Data Access Layer)

**✅ Use Sempre:**
- `src/repositories/leadsRepo.ts` - Acessa `fichas` no Supabase LOCAL
- `src/repositories/fichasRepo.ts` - Acessa `fichas` no Supabase LOCAL
- `src/repositories/dashboardRepo.ts` - Acessa `fichas` no Supabase LOCAL

**✅ Uso Específico:**
- `src/repositories/tabuladorConfigRepo.ts` - Configura conexão com TabuladorMax
  - **Importante:** Ao testar conexão, consulta `leads` no TabuladorMax (correto)

**❌ Nunca Use:**
- Consultas diretas à tabela `leads` local (deprecated)
- Importações de `GoogleSheetsService` (deprecated)
- Importações de `MockDataService` (apenas testes)

### Hooks

**✅ Use Sempre:**
- `src/hooks/useFichas.ts` - Busca fichas com fallback criado/created_at
- `src/hooks/useFichasGeo.ts` - Busca fichas geográficas via RPC
  - **Atualizado:** Agora monitora tabela `fichas` (não `leads`)

### Serviços

**✅ Use Sempre:**
- `src/services/dashboardQueryService.ts` - Queries dinâmicas em `fichas`

**❌ Deprecated:**
- `src/services/mockDataService.ts` - Apenas para testes locais

## 🔒 Regras de Acesso

### Supabase LOCAL

**RLS (Row Level Security):**
- `fichas` - Leitura pública, escrita autenticada
- `scouters` - Leitura/escrita autenticada
- `sync_queue` - Apenas service role

**Edge Functions:**
- Executam com service role
- Têm acesso total às tabelas
- Gerenciam sincronização

### TabuladorMax

**Acesso:**
- Configurado via `tabulador_config`
- Credenciais armazenadas localmente (localStorage + Supabase)
- Acesso via cliente separado do Supabase

## 🚫 Lista de Verificação: O Que NÃO Fazer

### ❌ Código
- [ ] ~~Consultar tabela `leads` no Supabase LOCAL~~
- [ ] ~~Usar `GoogleSheetsService` ou referências a Google Sheets~~
- [ ] ~~Importar ou usar `MockDataService` em produção~~
- [ ] ~~Consultar `bitrix_leads` para dados atuais~~
- [ ] ~~Criar novos endpoints que acessem tabelas legacy~~

### ❌ Banco de Dados
- [ ] ~~Inserir dados na tabela `leads` local~~
- [ ] ~~Modificar schema de tabelas legacy~~
- [ ] ~~Criar foreign keys para tabelas deprecated~~

### ❌ UI/UX
- [ ] ~~Adicionar seletores de fonte de dados (Google Sheets/Bitrix)~~
- [ ] ~~Mostrar opções de importação do Google Sheets~~
- [ ] ~~Referenciar "planilhas" como fonte de dados~~

## ✅ Lista de Verificação: O Que Fazer

### ✅ Código
- [x] Sempre consultar tabela `fichas` no Supabase LOCAL
- [x] Usar repositórios centralizados (`leadsRepo`, `fichasRepo`)
- [x] Implementar fallback criado/created_at em queries
- [x] Adicionar comentários claros sobre arquitetura
- [x] Validar dados antes de salvar

### ✅ Sincronização
- [x] Configurar TabuladorMax via UI de configurações
- [x] Monitorar logs de sincronização
- [x] Tratar erros de sync graciosamente
- [x] Manter `sync_queue` limpa

### ✅ Manutenção
- [x] Documentar mudanças em arquitetura
- [x] Atualizar comentários ao modificar repositórios
- [x] Testar sincronização bidirecional
- [x] Monitorar performance de queries

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Supabase LOCAL (Gestão Scouter)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
VITE_SUPABASE_PROJECT_ID=seu-project-id

# TabuladorMax configurado via UI
# (Armazenado em tabulador_config table + localStorage)
```

### TabuladorMax Config

Configuração gerenciada via:
1. UI de Configurações (`src/pages/Configuracoes/TabuladorMaxConfig.tsx`)
2. Armazenamento em `tabulador_config` table
3. Cache em localStorage para acesso rápido

## 📊 Monitoria e Logs

### Edge Functions

**Logs importantes:**
```typescript
// Sync bem-sucedido
✅ [Sync] Ficha ${id} sincronizada com TabuladorMax

// Erro de sync
❌ [Sync] Erro ao sincronizar ficha ${id}: ${error}

// Queue processada
📋 [Queue] Processados ${count} itens da fila
```

### Aplicação

**Logs de repositório:**
```typescript
// Busca bem-sucedida
✅ [LeadsRepo] ${count} fichas retornadas

// Fallback de coluna
⚠️  [useFichas] Usando fallback created_at para ordenação

// Erro de query
❌ [DashboardRepo] Erro ao buscar dados: ${error}
```

## 🎯 Próximos Passos Recomendados

1. **Remover Código Legacy:**
   - Apagar arquivos de serviços deprecated
   - Limpar comentários e imports não utilizados
   - Remover tabelas legacy do schema

2. **Melhorar Sincronização:**
   - Adicionar retry automático para falhas
   - Implementar conflict resolution
   - Melhorar logs e monitoria

3. **Performance:**
   - Adicionar índices otimizados em `fichas`
   - Implementar cache de queries frequentes
   - Otimizar Edge Functions

4. **Testes:**
   - Criar suite de testes para repositórios
   - Testar cenários de sync
   - Validar fallback criado/created_at

## 📚 Documentos Relacionados

- [COLUMN_FALLBACK_STRATEGY.md](./COLUMN_FALLBACK_STRATEGY.md) - Estratégia de fallback de colunas
- [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md) - Arquitetura de sincronização
- [CENTRALIZACAO_FICHAS_SUMMARY.md](./CENTRALIZACAO_FICHAS_SUMMARY.md) - Centralização de fichas

## 🔄 Histórico de Mudanças

- **2025-10-17**: Limpeza de referências legacy
  - Corrigida subscription realtime em useFichasGeo (leads → fichas)
  - Removido seletor de fonte de dados do DashboardHeader
  - Atualizados comentários para clarificar arquitetura
  - Adicionada documentação sobre TabuladorMax sync

- **2025-10-17**: Implementação de fallback criado/created_at
  - Suporte dual-column em SQL functions
  - Fallback em repositories e hooks
  - Documentação completa da estratégia
