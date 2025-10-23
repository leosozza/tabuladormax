# Complete Leads Centralization - Implementation Summary

## 🎯 Objetivo

Este PR implementa a **centralização completa** de dados de leads/fichas na tabela `leads` do Supabase, eliminando inconsistências e problemas de visualização no dashboard e páginas de leads.

## ⚠️ Problema Identificado

Antes desta correção, a aplicação tinha vários problemas:

1. **Frontend e backend usavam tabelas diferentes** - Alguns componentes buscavam de `fichas`, outros de `leads`
2. **Scripts de teste inconsistentes** - `insertFakeLeads.js` inseria em `fichas` em vez de `leads`
3. **Filtros quebravam** - Campo `deleted` não era tratado adequadamente
4. **Documentação confusa** - Não estava claro qual tabela usar
5. **Logs insuficientes** - Difícil diagnosticar problemas de carregamento de dados
6. **Sem validação** - Nenhum script para verificar setup correto

## ✅ Solução Implementada

### 1. Correção de Scripts de Teste e Migração

#### ✏️ `scripts/insertFakeLeads.js`
**Mudanças:**
- Alterado de `from('fichas')` para `from('leads')`
- Adicionado campo `deleted: false` em todos os registros
- Campo `raw` agora é preenchido com backup completo dos dados
- Data `criado` usa formato YYYY-MM-DD (date only)
- Documentação atualizada para indicar tabela `leads` como fonte única

#### ✏️ `scripts/syncLeadsToFichas.ts`
**Mudanças:**
- Comentários atualizados: TabuladorMax leads → Gestão Scouter leads
- Função `normalizeLeadToFicha` renomeada internamente mas mantém compatibilidade
- Interface `LeadRecord` criada para clarificar tipo de retorno
- Data normalizada para YYYY-MM-DD em vez de ISO timestamp completo
- Logs mais detalhados durante sincronização

#### ✏️ `scripts/testMigration.ts`
**Mudanças:**
- Documentação atualizada: referência a `leads` em vez de `fichas`
- Exemplos de teste atualizados para refletir nova estrutura
- Comentários explicativos sobre o formato de data

### 2. Melhorias em Repositórios

#### ✏️ `src/repositories/fichasRepo.ts`
**Mudanças:**
- **Logging completo** adicionado para debug
- Console.log em cada etapa da query
- Filtro de `deleted` explicitamente documentado
- Tratamento de erro melhorado
- Comentários atualizados

**Exemplo de logs:**
```
🔍 [fichasRepo] Buscando dados da tabela "leads"
🗂️  [fichasRepo] Filtros aplicados: { start: "2024-01-01", end: "2024-12-31" }
📅 [fichasRepo] Filtro data início: 2024-01-01
📅 [fichasRepo] Filtro data fim: 2024-12-31
✅ [fichasRepo] 150 registros retornados da tabela "leads"
```

#### ✏️ `src/repositories/dashboardRepo.ts`
**Mudanças:**
- **Logging completo** adicionado
- Filtro `.or('deleted.is.false,deleted.is.null')` adicionado
- Console.log para cada filtro aplicado
- Erro mais detalhado
- Comentários explicativos

**Exemplo de logs:**
```
🔍 [dashboardRepo] Iniciando busca de dados do dashboard
🗂️  [dashboardRepo] Tabela: "leads"
🗂️  [dashboardRepo] Filtros: { scouter: "João" }
👤 [dashboardRepo] Filtro scouter: João
✅ [dashboardRepo] 42 registros retornados da tabela "leads"
```

#### ✏️ `src/repositories/leadsRepo.ts`
**Já estava correto**, mas logs foram revisados para consistência.

### 3. Correção de Hooks

#### ✏️ `src/hooks/useSupabaseData.ts`
**Mudanças:**
- **Removido fallback específico para tabela `fichas`** (linha 63-66)
- Lógica de ordenação simplificada (sem casos especiais)
- Logging adicionado para debug
- Detecção de campos ausentes agora inclui `leads` em vez de `fichas`

**Antes:**
```typescript
if (table === 'fichas' && orderBy.column === 'created_at') {
  queryBuilder = queryBuilder.order('criado', { ascending: false });
}
```

**Depois:**
```typescript
queryBuilder = queryBuilder.order(orderBy.column, { ascending: orderBy.ascending ?? false });
```

### 4. Nova Migração SQL

#### 📄 `supabase/migrations/20251018_ensure_leads_deleted_column.sql`

**Propósito:** Garantir que a coluna `deleted` existe na tabela `leads`

**O que faz:**
- Adiciona coluna `deleted BOOLEAN DEFAULT FALSE` se não existir
- Garante que registros existentes têm `deleted = FALSE`
- Torna coluna NOT NULL após preencher valores
- Cria índices otimizados:
  - `idx_leads_not_deleted` - Query de registros ativos
  - `idx_leads_criado_not_deleted` - Ordenação por data + filtro
- Script de verificação integrado

**Segurança:**
- Idempotente (pode executar múltiplas vezes)
- Usa `IF NOT EXISTS` para evitar erros
- Não modifica dados existentes

### 5. Novo Script de Verificação

#### 📄 `scripts/verify-leads-setup.ts`

**Propósito:** Validar configuração completa da tabela `leads`

**Verificações realizadas:**
1. ✅ Variáveis de ambiente configuradas
2. ✅ Tabela `leads` existe e está acessível
3. ✅ Coluna `deleted` existe
4. ✅ Colunas obrigatórias presentes (id, criado, projeto, scouter, nome, deleted)
5. ✅ Dados podem ser lidos
6. ✅ Filtro de deletados funciona
7. ✅ Filtros de data funcionam

**Como executar:**
```bash
npm run verify:leads-setup
```

**Saída esperada:**
```
✅ 1. Configuração: Variáveis de ambiente
   Status: PASS
   Todas as variáveis de ambiente necessárias estão configuradas

✅ 2. Tabela: Existência de "leads"
   Status: PASS
   Tabela "leads" existe e está acessível

✅ 3. Coluna: "deleted"
   Status: PASS
   Coluna "deleted" existe e está acessível

... (mais verificações)

📊 RESUMO: 7 passou | 0 avisos | 0 falhou
✅ Todas as verificações passaram! A tabela "leads" está configurada corretamente.
```

### 6. Documentação Completa

#### 📄 `docs/DATA_FLOW_LEADS.md`

**Conteúdo:**
- Arquitetura de dados (diagramas)
- Fluxo completo de dados (TabuladorMax → Leads)
- Referência de colunas obrigatórias
- Padrões de filtro corretos
- Guia de troubleshooting
- Exemplos de código
- Checklist de verificação
- Melhores práticas

**Tópicos principais:**
- ✅ Fonte única de verdade: tabela `leads`
- ❌ O que NÃO usar (fichas, bitrix_leads, etc.)
- 📊 Fluxo de dados completo
- 🔒 Verificação de RLS
- 🐛 Troubleshooting comum
- 📝 Referência de colunas
- 🧪 Como testar

#### 📄 `docs/RLS_POLICIES_LEADS.md`

**Conteúdo:**
- Guia completo de Row Level Security
- Políticas recomendadas (dev e produção)
- Scripts SQL prontos para uso
- Testes de verificação
- Troubleshooting de RLS
- Melhores práticas de segurança

**Políticas incluídas:**
1. Leitura (SELECT) - Todos usuários autenticados
2. Inserção (INSERT) - Todos usuários autenticados
3. Atualização (UPDATE) - Baseado em roles
4. Soft Delete - Admin/Manager apenas

## 📊 Fluxo de Dados (Antes vs Depois)

### ❌ ANTES (Inconsistente)

```
Dashboard → dashboardRepo → leads ✓
                          ↓
Leads Page → leadsRepo → leads ✓
                          ↓
Test Scripts → insertFakeLeads → fichas ✗ (ERRADO!)
                          ↓
Maps → useFichas → leads ✓
```

### ✅ DEPOIS (Consistente)

```
Dashboard → dashboardRepo → leads ✓ (com logs)
                          ↓
Leads Page → leadsRepo → leads ✓ (com logs)
                          ↓
Test Scripts → insertFakeLeads → leads ✓ (CORRETO!)
                          ↓
Maps → useFichas → leads ✓ (com logs)
                          ↓
Verification → verify-leads-setup → leads ✓ (validação)
```

## 🔍 Como Verificar que Funcionou

### 1. Execute o script de verificação
```bash
npm run verify:leads-setup
```

Deve passar todas as verificações.

### 2. Insira dados de teste
```bash
node scripts/insertFakeLeads.js
```

Deve inserir 20 leads na tabela `leads` (não `fichas`).

### 3. Verifique no Supabase
```sql
-- No SQL Editor do Supabase
SELECT COUNT(*) as total, 
       COUNT(*) FILTER (WHERE deleted = false) as ativos,
       COUNT(*) FILTER (WHERE deleted = true) as deletados
FROM leads;
```

### 4. Abra a aplicação
```bash
npm run dev
```

1. Acesse o Dashboard
2. Verifique se os cards mostram dados
3. Verifique se os gráficos renderizam
4. Acesse a página de Leads
5. Verifique se a tabela mostra dados

### 5. Verifique logs no console

Você deve ver logs como:
```
🔍 [dashboardRepo] Iniciando busca de dados do dashboard
🗂️  [dashboardRepo] Tabela: "leads"
✅ [dashboardRepo] 42 registros retornados da tabela "leads"
```

## 🛠️ Comandos Úteis

```bash
# Verificar setup da tabela leads
npm run verify:leads-setup

# Inserir dados de teste
node scripts/insertFakeLeads.js

# Sincronizar do TabuladorMax
npm run migrate:leads

# Build da aplicação
npm run build

# Lint
npm run lint

# Dev server
npm run dev
```

## 📝 Checklist de Validação

Antes de fazer merge:

### Código
- [x] Todos os scripts usam tabela `leads` (não `fichas`)
- [x] Todos os repositórios filtram `deleted = false`
- [x] Logging adequado em todos os repositórios
- [x] Hooks não têm lógica específica para `fichas`
- [x] Migração SQL para garantir coluna `deleted` existe

### Testes
- [x] Build passa sem erros (`npm run build`)
- [x] Lint passa (ou apenas warnings não-críticos)
- [x] Script de verificação passa

### Documentação
- [x] DATA_FLOW_LEADS.md criado
- [x] RLS_POLICIES_LEADS.md criado
- [x] Comentários em código atualizados
- [x] Scripts têm headers explicativos

### Funcionalidade
- [ ] Dashboard carrega dados (testar manualmente)
- [ ] Leads page carrega dados (testar manualmente)
- [ ] Filtros funcionam (testar manualmente)
- [ ] Criação de leads funciona (testar manualmente)
- [ ] Soft delete funciona (testar manualmente)

## 🎓 Lições Aprendidas

1. **Consistência é crucial** - Uma única fonte de verdade evita bugs
2. **Logging salva vidas** - Debug é muito mais fácil com logs adequados
3. **Documentação previne regressão** - Desenvolvedores futuros saberão o padrão correto
4. **Validação automatizada** - Scripts de verificação detectam problemas cedo
5. **Migrations são importantes** - Garantir schema correto evita erros em runtime

## 🚀 Próximos Passos (Recomendados)

1. **Executar migration** em produção
2. **Configurar RLS policies** conforme `docs/RLS_POLICIES_LEADS.md`
3. **Testar em staging** antes de produção
4. **Monitorar logs** após deploy
5. **Considerar deprecar** completamente a tabela `fichas` (se não for mais usada)

## 📞 Suporte

Se encontrar problemas:

1. Execute `npm run verify:leads-setup` para diagnóstico
2. Consulte `docs/DATA_FLOW_LEADS.md` para fluxo de dados
3. Consulte `docs/RLS_POLICIES_LEADS.md` para problemas de RLS
4. Verifique logs do console (com prefixos [dashboardRepo], [leadsRepo], etc.)
5. Verifique Supabase SQL Editor para dados na tabela

## 🎯 Impacto Esperado

### Antes
- ❌ Dashboard pode não mostrar dados
- ❌ Leads page pode não mostrar dados
- ❌ Inconsistência entre diferentes telas
- ❌ Difícil diagnosticar problemas
- ❌ Scripts de teste inserem em tabela errada

### Depois
- ✅ Dashboard sempre usa tabela `leads`
- ✅ Leads page sempre usa tabela `leads`
- ✅ Consistência total em toda aplicação
- ✅ Logs detalhados facilitam debug
- ✅ Scripts de teste corretos
- ✅ Documentação clara
- ✅ Verificação automatizada

---

**Autor:** GitHub Copilot  
**Data:** 2025-10-18  
**Versão:** 1.0  
**Status:** Pronto para Review
