## ⚠️ NOTA: Este documento está obsoleto ou parcialmente obsoleto

**Status**: ⚠️ Este documento contém referências a implementações antigas que dependiam de Google Sheets.

**Arquitetura Atual**: TabuladorMax → Supabase (tabela 'leads') → Repository → Hook → Componente

Para informações atualizadas, consulte:
- [LEADS_DATA_SOURCE.md](../LEADS_DATA_SOURCE.md)
- [README.md](../README.md)

---

# Documentação do Schema Supabase - Gestão Scouter

## 📋 Índice de Documentação

Este diretório contém toda a documentação necessária para configurar, validar e manter o schema do banco de dados do projeto Gestão Scouter.

### Arquivos Principais

1. **[gestao-scouter-fichas-table.sql](./gestao-scouter-fichas-table.sql)** (880 linhas)
   - ⭐ Script SQL completo e idempotente
   - Cria todas as tabelas, índices, triggers e policies
   - Pronto para execução no Supabase

2. **[COMO_EXECUTAR_SCHEMA.md](./COMO_EXECUTAR_SCHEMA.md)** (350+ linhas)
   - 📖 Guia passo a passo para executar o script SQL
   - 3 métodos diferentes (Dashboard, CLI, psql)
   - Troubleshooting e backup/rollback

3. **[VALIDACAO_SCHEMA.md](./VALIDACAO_SCHEMA.md)** (400+ linhas)
   - ✅ Checklist completa de validação
   - Queries SQL para verificar cada componente
   - Testes de triggers e funções
   - Solução de problemas comuns

4. **[IMPORTACAO_DADOS.md](./IMPORTACAO_DADOS.md)** (450+ linhas)
   - 📥 4 métodos de importação de dados
   - Google Sheets, CSV, Node.js, TabuladorMax
   - Scripts prontos para uso
   - Validação pós-importação

5. **[TESTE_SINCRONIZACAO.md](./TESTE_SINCRONIZACAO.md)** (600+ linhas)
   - 🔄 Testes completos de sincronização
   - Testes unitários, integração e E2E
   - Performance e stress testing
   - Monitoramento contínuo

## 🚀 Guia Rápido

### Para Configurar o Schema pela Primeira Vez

```bash
# 1. Executar o script SQL principal
#    Ver: COMO_EXECUTAR_SCHEMA.md

# 2. Validar que tudo foi criado corretamente
#    Ver: VALIDACAO_SCHEMA.md

# 3. Importar dados existentes (opcional)
#    Ver: IMPORTACAO_DADOS.md

# 4. Configurar e testar sincronização
#    Ver: TESTE_SINCRONIZACAO.md
```

### Fluxo de Trabalho Recomendado

```
1. 📄 Ler COMO_EXECUTAR_SCHEMA.md
   ↓
2. ▶️ Executar gestao-scouter-fichas-table.sql
   ↓
3. ✅ Seguir VALIDACAO_SCHEMA.md
   ↓
4. 📥 Opcional: IMPORTACAO_DADOS.md
   ↓
5. 🔄 Configurar: TESTE_SINCRONIZACAO.md
   ↓
6. 🎉 Schema pronto!
```

## 📊 O Que o Schema Cria

### Tabelas (8 total)

1. **fichas** (60+ colunas)
   - Tabela centralizada de leads/fichas
   - Fonte única de verdade
   - Suporta sincronização bidirecional

2. **sync_queue**
   - Fila de sincronização
   - Rastreamento de mudanças

3. **sync_logs**
   - Histórico de sincronizações
   - Auditoria e debugging

4. **sync_status**
   - Estado atual da sincronização
   - Heartbeat de saúde

5. **roles**
   - Roles disponíveis no sistema
   - 5 roles padrão

6. **user_roles**
   - Relacionamento usuário-role
   - Controle de acesso

7. **profiles**
   - Perfis de usuários
   - Dados complementares

8. **permissions**
   - Permissões detalhadas
   - Por role e módulo

### Funcionalidades

- ✅ **60+ colunas** na tabela fichas
- ✅ **30+ índices** otimizados
- ✅ **3 triggers** automáticos
- ✅ **5 funções** customizadas
- ✅ **Políticas RLS** configuradas
- ✅ **Seed de dados** inicial
- ✅ **Idempotente** (re-executável)
- ✅ **Bem documentado** (comentários SQL)

### Compatibilidade

O schema suporta **aliases de campos** para compatibilidade:

| Campo Novo | Campo Legado | Tipo |
|------------|--------------|------|
| `name` | `nome` | TEXT |
| `created_at` | `criado` | TIMESTAMPTZ / DATE |
| `latitude` | `lat` | DOUBLE PRECISION |
| `longitude` | `lng` | DOUBLE PRECISION |
| `last_sync_at` | `last_synced_at` | TIMESTAMPTZ |

Isso permite que o front-end use qualquer nome sem quebrar.

## 🎯 Cenários de Uso

### Cenário 1: Novo Projeto

**Situação:** Configurando Gestão Scouter pela primeira vez

**Passos:**
1. Executar `gestao-scouter-fichas-table.sql`
2. Validar com queries de `VALIDACAO_SCHEMA.md`
3. Testar front-end (sem dados ainda)
4. Importar dados conforme `IMPORTACAO_DADOS.md`
5. Configurar sincronização se necessário

**Tempo estimado:** 30-60 minutos

### Cenário 2: Restaurar Schema

**Situação:** Schema corrompido ou migrations falharam

**Passos:**
1. Fazer backup atual (mesmo corrompido)
2. Re-executar `gestao-scouter-fichas-table.sql`
3. Validar com `VALIDACAO_SCHEMA.md`
4. Verificar que dados existentes não foram perdidos
5. Testar aplicação

**Tempo estimado:** 15-30 minutos

### Cenário 3: Adicionar Sincronização

**Situação:** Configurar sync Gestão Scouter ↔ TabuladorMax

**Passos:**
1. Garantir schema está correto (executar script se necessário)
2. Seguir `TESTE_SINCRONIZACAO.md` seção 1-3
3. Configurar Edge Functions
4. Executar testes E2E da seção 3
5. Configurar monitoramento da seção 6

**Tempo estimado:** 2-4 horas

### Cenário 4: Importar Dados Históricos

**Situação:** Migrar dados de planilha ou sistema antigo

**Passos:**
1. Garantir schema está criado
2. Preparar arquivo CSV conforme `IMPORTACAO_DADOS.md`
3. Escolher método de importação (Dashboard ou Node.js)
4. Executar importação
5. Validar com queries pós-importação

**Tempo estimado:** 1-3 horas (depende do volume)

### Cenário 5: Atualizar Schema Existente

**Situação:** Adicionar novas colunas ou índices

**Passos:**
1. Fazer backup do schema atual
2. Re-executar `gestao-scouter-fichas-table.sql`
3. Verificar que dados existentes não foram afetados
4. Validar novas colunas/índices
5. Testar aplicação

**Tempo estimado:** 15-20 minutos

## 🔍 Queries Úteis

### Ver Todas as Tabelas

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Ver Estrutura da Tabela Fichas

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'fichas'
ORDER BY ordinal_position;
```

### Ver Índices

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fichas'
ORDER BY indexname;
```

### Ver Triggers

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

### Ver Políticas RLS

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 📈 Monitoramento

### Verificar Saúde do Schema

```sql
-- Ver status de sincronização
SELECT * FROM public.sync_status;

-- Ver últimas sincronizações
SELECT * FROM public.sync_logs
ORDER BY started_at DESC
LIMIT 10;

-- Ver fila de sync
SELECT status, COUNT(*) 
FROM public.sync_queue
GROUP BY status;

-- Ver total de fichas
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN deleted = false THEN 1 END) as ativas,
  COUNT(CASE WHEN deleted = true THEN 1 END) as deletadas
FROM public.fichas;
```

### Métricas de Performance

```sql
-- Tamanho das tabelas
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Uso de índices
SELECT 
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## 🚨 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Script não executa | Ver seção Troubleshooting em COMO_EXECUTAR_SCHEMA.md |
| Dados não aparecem | Verificar RLS em VALIDACAO_SCHEMA.md |
| Sincronização não funciona | Seguir testes em TESTE_SINCRONIZACAO.md |
| Importação falha | Ver métodos alternativos em IMPORTACAO_DADOS.md |
| Performance lenta | Verificar índices e queries em VALIDACAO_SCHEMA.md |

## 📚 Referências Externas

- **Supabase Docs:** https://supabase.com/docs/guides/database
- **PostgreSQL Docs:** https://www.postgresql.org/docs/current/
- **SQL Tutorial:** https://www.postgresql.org/docs/current/tutorial.html
- **RLS Docs:** https://supabase.com/docs/guides/database/postgres/row-level-security

## 🔄 Atualizações Futuras

Este schema é versionado e pode receber atualizações. Quando isso acontecer:

1. Um novo arquivo SQL será criado (ex: `gestao-scouter-fichas-table-v2.sql`)
2. Ou uma migration incremental será fornecida
3. Documentação será atualizada com changelog

**Versão Atual:** 1.0 (2025-10-18)

## ✅ Checklist de Sucesso

Use esta checklist para confirmar que o schema foi configurado corretamente:

- [ ] Script SQL executado sem erros
- [ ] 8 tabelas criadas (fichas, sync_*, roles, user_roles, profiles, permissions)
- [ ] 60+ colunas na tabela fichas
- [ ] 30+ índices criados
- [ ] 3 triggers ativos
- [ ] 5 funções criadas
- [ ] RLS habilitado em todas as tabelas
- [ ] 5 roles seed criados
- [ ] Permissões configuradas
- [ ] Políticas RLS funcionando
- [ ] Front-end consegue ler dados
- [ ] Front-end consegue criar/editar fichas
- [ ] Sincronização funciona (se configurada)

Se todos os itens estão marcados: **🎉 Schema configurado com sucesso!**

## 📞 Suporte

Para dúvidas ou problemas:

1. **Verificar documentação:** Ler arquivos .md correspondentes
2. **Consultar logs:** Supabase Dashboard → Logs → Postgres
3. **Executar validações:** Queries de VALIDACAO_SCHEMA.md
4. **Abrir issue:** GitHub do projeto com detalhes completos

## 📝 Contribuindo

Ao fazer melhorias neste schema:

1. Atualizar arquivo SQL principal
2. Atualizar documentação correspondente
3. Adicionar entry no changelog (abaixo)
4. Testar em ambiente de desenvolvimento
5. Documentar breaking changes

## 📅 Changelog

### v1.0 (2025-10-18)
- ✨ Criação inicial do schema completo
- ✨ 60+ colunas na tabela fichas
- ✨ Tabelas auxiliares de sincronização
- ✨ Sistema completo de autenticação
- ✨ Políticas RLS configuradas
- ✨ Documentação completa (4 guias)
- ✨ Scripts de validação e teste

---

**Projeto:** Gestão Scouter  
**Última atualização:** 2025-10-18  
**Versão Schema:** 1.0  
**Status:** ✅ Pronto para produção
