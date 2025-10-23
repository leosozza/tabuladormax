# Checklist de Validação - Centralização da Tabela 'leads'

## 🎯 Objetivo

Validar que toda a aplicação Gestão Scouter usa exclusivamente a tabela `leads` do Supabase como fonte de dados, sem dependências de fontes alternativas.

## ✅ Checklist de Verificação

### 1. Verificação de Código

#### Queries e Repositories
- [ ] `src/hooks/useFichasGeo.ts` usa `.from('leads')`
- [ ] `src/repositories/leadsRepo.ts` usa `.from('leads')`
- [ ] `src/repositories/dashboardRepo.ts` usa `.from('leads')`
- [ ] `src/repositories/fichasRepo.ts` usa `.from('leads')` (ou foi removido)
- [ ] Nenhum arquivo de produção usa `.from('fichas')`
- [ ] Nenhum arquivo de produção usa `.from('bitrix_leads')`

#### Imports e Dependências
- [ ] Nenhum import de `MockDataService` em código de produção
- [ ] Páginas principais (Leads, Dashboard) importam de repositories corretos
- [ ] Hooks personalizados usam tabela `leads`

#### Comentários e Alertas
- [ ] `useFichasGeo.ts` contém alerta sobre fonte única (leads)
- [ ] `leadsRepo.ts` contém header com avisos importantes
- [ ] `mockDataService.ts` marcado como dev-only
- [ ] `types.ts` explica relação Lead

### 2. Verificação de Documentação

#### Documentos Principais
- [ ] `LEADS_DATA_SOURCE.md` existe e está completo
- [ ] `CENTRALIZACAO_LEADS_SUMMARY.md` existe
- [ ] `README.md` referencia a fonte única (leads)
- [ ] Documentos legados sobre fichas movidos para legacy/ ou atualizados

#### Conteúdo da Documentação
- [ ] Fluxo de dados explicado claramente
- [ ] Lista do que usar e NÃO usar
- [ ] Exemplos práticos de código fornecidos
- [ ] Checklist para novos desenvolvedores
- [ ] Seção de troubleshooting incluída
- [ ] Estrutura da tabela documentada

### 3. Verificação de Scripts

#### Scripts de Migração
- [ ] `scripts/syncLeadsToFichas.ts` deprecated ou removido
- [ ] `scripts/verify-leads-centralization.sh` funcional
- [ ] Script de verificação adicionado ao `package.json` como `verify:leads`

#### Migrations SQL
- [ ] `20251018_migrate_fichas_to_leads.sql` com comentários detalhados
- [ ] Índices criados corretamente na tabela leads
- [ ] RLS policies configuradas para leads
- [ ] Trigger de updated_at funcionando

### 4. Verificação de Build

#### Compilação
- [ ] `npm run build` executa sem erros
- [ ] Sem erros TypeScript
- [ ] Sem warnings críticos
- [ ] Bundle size aceitável

#### Runtime
- [ ] Aplicação inicia sem erros no console
- [ ] Queries para `fichas` funcionando
- [ ] Dados carregando corretamente
- [ ] Filtros funcionando

### 5. Verificação de Interfaces

#### Páginas Principais
- [ ] `/leads` - Lista de leads carregando da tabela `leads`
- [ ] `/dashboard` - Dashboard usando dados de `leads`
- [ ] `/area-de-abordagem` - Mapas usando dados de `leads`
- [ ] `/pagamentos` - Pagamentos referenciando `leads`

#### Componentes Críticos
- [ ] `PerformanceDashboard` busca de `leads`
- [ ] `LeadsTable` exibe dados de `leads`
- [ ] `UnifiedMap` usa dados geográficos de `leads`
- [ ] Filtros aplicam queries em `leads`
- [ ] `useFichasGeo` hook consulta `leads` com latitude/longitude

### 6. Verificação de Dados

#### Estrutura da Tabela
- [ ] Campo `id` (text, primary key)
- [ ] Campo `raw` (jsonb, not null)
- [ ] Campo `scouter` (text, indexed)
- [ ] Campo `projeto` (text, indexed)
- [ ] Campo `criado` (date, indexed)
- [ ] Campo `valor_ficha` (numeric)
- [ ] Campo `deleted` (boolean, default false)
- [ ] Campo `latitude` (numeric) - para geolocalização
- [ ] Campo `longitude` (numeric) - para geolocalização
- [ ] Campo `updated_at` (timestamptz)
- [ ] Campo `created_at` (timestamptz)

#### Queries Comuns
- [ ] Busca básica: `SELECT * FROM leads WHERE deleted = false`
- [ ] Filtro por data: `.gte('criado', startDate).lte('criado', endDate)`
- [ ] Filtro por scouter: `.ilike('scouter', '%nome%')`
- [ ] Filtro por projeto: `.eq('projeto', 'nome_projeto')`
- [ ] Ordenação: `.order('criado', { ascending: false })`
- [ ] Geolocalização: `.not('latitude', 'is', null).not('longitude', 'is', null)`

### 7. Verificação de Compatibilidade

#### Retrocompatibilidade
- [ ] Tipo `Lead` ainda existe (alias para `Ficha`)
- [ ] Funções legadas ainda funcionam
- [ ] Nenhuma breaking change introduzida
- [ ] Código antigo continua compilando

#### Migrações
- [ ] Dados migrados mantêm integridade
- [ ] Campo `raw` preserva dados originais
- [ ] IDs são únicos e estáveis
- [ ] Timestamps corretos

### 8. Verificação Automatizada

#### Scripts de Verificação
```bash
# Executar verificação completa
npm run verify:leads

# Build de produção
npm run build

# Verificar migrations
# (executar via Supabase CLI se disponível)
```

#### Resultados Esperados
- [ ] Script de verificação passa (todos os checks)
- [ ] Build completa em < 30s
- [ ] Sem erros no console
- [ ] Todas as queries usando `leads`
- [ ] Nenhuma query usando `fichas` em código de produção

### 9. Testes Manuais

#### Navegação e UI
1. [ ] Acessar `/leads` e verificar lista de leads
2. [ ] Aplicar filtros e verificar resultados
3. [ ] Acessar `/dashboard` e verificar métricas
4. [ ] Verificar mapas em `/area-de-abordagem`
5. [ ] Testar busca e ordenação

#### DevTools
1. [ ] Abrir Network tab
2. [ ] Verificar requests para Supabase
3. [ ] Confirmar queries para tabela `fichas`
4. [ ] Verificar ausência de queries para `leads` ou `bitrix_leads`
5. [ ] Checar console para warnings

### 10. Validação de Produção

#### Antes do Deploy
- [ ] Todas as verificações acima passaram
- [ ] Documentação revisada e aprovada
- [ ] Migração de fichas para leads concluída
- [ ] Build de produção validada
- [ ] Edge functions atualizadas para usar leads

#### Pós-Deploy
- [ ] Aplicação funcionando normalmente
- [ ] Dados carregando de `leads`
- [ ] Performance mantida
- [ ] Sem erros nos logs
- [ ] Sincronização TabuladorMax operando corretamente (leads ↔ leads)

## 🔍 Como Executar a Verificação

### Verificação Automatizada
```bash
# 1. Clonar/atualizar repositório
git pull origin main

# 2. Instalar dependências
npm install

# 3. Executar verificação
npm run verify:leads

# 4. Executar build
npm run build

# 5. Iniciar dev server e testar manualmente
npm run dev
```

### Verificação Manual
1. Abrir cada arquivo listado na checklist
2. Verificar conteúdo conforme descrito
3. Marcar itens completados
4. Registrar problemas encontrados

## 📊 Critérios de Aceitação

### Mínimo Necessário
- ✅ 100% das queries de produção usando `leads`
- ✅ 0 queries para tabela `fichas` em código de produção
- ✅ 0 queries para tabelas legadas (`bitrix_leads`)
- ✅ 0 imports de `MockDataService` em produção
- ✅ Build sem erros
- ✅ Documentação completa e atualizada

### Desejável
- ✅ Script de verificação passando (todos os checks)
- ✅ Todos os comentários de alerta presentes
- ✅ Todas as páginas testadas manualmente
- ✅ Performance mantida ou melhorada
- ✅ Edge functions atualizadas para leads
- ✅ Sincronização bidirecional TabuladorMax funcionando

## 🐛 Resolução de Problemas

### Se a verificação falhar:

#### Query para tabela 'fichas' encontrada em produção
```bash
# Encontrar e corrigir
grep -r "\.from('fichas')" src --include="*.ts" --include="*.tsx"
# Substituir por .from('leads')
```

#### Query legada ainda presente
```bash
# Encontrar imports
grep -r "import.*MockDataService" src --include="*.ts" --include="*.tsx"
# Remover ou usar repository correto
```

#### Build falhando
```bash
# Ver erros detalhados
npm run build 2>&1 | tee build.log
# Corrigir erros TypeScript apontados
```

#### Documentação faltando
```bash
# Verificar existência
ls -la LEADS_DATA_SOURCE.md
ls -la CENTRALIZACAO_LEADS_SUMMARY.md
# Criar se necessário usando os templates
```

#### Edge Functions ainda usando fichas
```bash
# Verificar edge functions
grep -r "fichas" supabase/functions --include="*.ts"
# Atualizar para usar 'leads'
```

## 📝 Registro de Validação

**Data da Validação**: _________________

**Responsável**: _________________

**Versão do Código**: _________________

**Resultado**: [ ] PASSOU  [ ] FALHOU  [ ] PARCIAL

**Observações**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Assinatura**: _________________

---

**Última atualização**: 2025-10-18  
**Versão**: 2.0.0 (migrado de fichas para leads)
