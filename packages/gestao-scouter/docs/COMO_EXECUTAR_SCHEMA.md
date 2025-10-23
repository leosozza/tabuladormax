## ⚠️ NOTA: Este documento está obsoleto ou parcialmente obsoleto

**Status**: ⚠️ Este documento contém referências a implementações antigas que dependiam de Google Sheets.

**Arquitetura Atual**: TabuladorMax → Supabase (tabela 'leads') → Repository → Hook → Componente

Para informações atualizadas, consulte:
- [LEADS_DATA_SOURCE.md](../LEADS_DATA_SOURCE.md)
- [README.md](../README.md)

---

# Como Executar o Schema Completo do Supabase

## Visão Geral

Este guia explica como executar o script SQL completo (`docs/gestao-scouter-fichas-table.sql`) para criar ou restaurar o schema do banco de dados do projeto Gestão Scouter.

## Arquivo Principal

**`docs/gestao-scouter-fichas-table.sql`**
- 880 linhas de SQL
- Script idempotente (pode ser executado múltiplas vezes)
- Cria/atualiza todas as tabelas, índices, triggers e policies necessários

## O Que o Script Cria

### 1. Tabela Fichas Completa (60+ colunas)
- Todos os campos necessários para leads/fichas
- Suporta aliases (nome/name, created_at/criado, lat/latitude)
- Campos de sincronização (sync_source, last_synced_at, last_sync_at)
- Campos de integração (Bitrix, MaxSystem, TabuladorMax)

### 2. Tabelas Auxiliares
- **sync_queue**: Fila de sincronização entre sistemas
- **sync_logs**: Histórico de sincronizações executadas
- **sync_status**: Estado atual da sincronização (heartbeat)

### 3. Tabelas de Autenticação
- **roles**: Roles disponíveis no sistema (5 roles padrão)
- **user_roles**: Relacionamento usuário-role
- **profiles**: Perfis de usuários
- **permissions**: Permissões detalhadas por role e módulo

### 4. Índices de Performance
- 30+ índices otimizados para queries comuns
- Índices parciais para melhor performance
- Índices para localização geográfica

### 5. Triggers Automáticos
- **updated_at**: Atualiza automaticamente ao modificar registros
- **fichas_sync_trigger**: Adiciona mudanças à fila de sincronização
- **on_auth_user_created**: Cria perfil automaticamente para novos usuários

### 6. Políticas RLS (Row Level Security)
- Leitura pública para tabela fichas (integração Lovable)
- Políticas abertas para roles, permissions, profiles
- Service role com acesso completo
- Prevenção de loops infinitos na sincronização

### 7. Funções de Segurança
- `has_role()`: Verifica se usuário tem determinado role
- `user_has_project_access()`: Verifica acesso ao projeto
- `update_updated_at_column()`: Atualiza timestamp automaticamente
- `queue_ficha_for_sync()`: Adiciona à fila de sincronização
- `handle_new_user()`: Cria perfil para novos usuários

### 8. Seed de Dados Inicial
- 5 roles padrão (admin, supervisor, scouter, gestor_telemarketing, telemarketing)
- Permissões configuradas para cada role
- Registros iniciais em sync_status

## Como Executar

### Método 1: Supabase Dashboard (Recomendado)

1. **Acessar o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Faça login com suas credenciais

2. **Selecionar o Projeto**
   - Escolha o projeto Gestão Scouter

3. **Abrir o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Ou acesse: https://supabase.com/dashboard/project/[PROJECT_ID]/sql

4. **Executar o Script**
   - Clique em "New Query"
   - Abra o arquivo `docs/gestao-scouter-fichas-table.sql`
   - Copie TODO o conteúdo (880 linhas)
   - Cole no editor SQL
   - Clique em "Run" (ou pressione Ctrl+Enter)

5. **Verificar Resultado**
   - O script exibe mensagens de progresso
   - Mensagens esperadas no final:
     ```
     NOTICE:  ========================================
     NOTICE:  ✅ SCRIPT EXECUTADO COM SUCESSO!
     NOTICE:  ========================================
     NOTICE:  Colunas adicionadas em fichas: 36/36
     NOTICE:  Tabelas criadas: 8/8
     NOTICE:  Índices criados em fichas: 30+
     NOTICE:  Triggers criados: 3/3
     NOTICE:  ========================================
     ```

6. **Em Caso de Erros**
   - O script é idempotente: pode ser executado novamente
   - Erros de "already exists" são normais em re-execuções
   - Verifique logs para identificar problemas reais

### Método 2: Supabase CLI

#### Pré-requisitos
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link com o projeto
supabase link --project-ref [PROJECT_ID]
```

#### Executar Script
```bash
# Opção A: Via reset (aplica todas migrations + script)
supabase db reset

# Opção B: Executar apenas este script
supabase db execute --file docs/gestao-scouter-fichas-table.sql

# Opção C: Via stdin
cat docs/gestao-scouter-fichas-table.sql | supabase db execute
```

#### Verificar Execução
```bash
# Verificar tabelas criadas
supabase db execute --sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Verificar contagem de colunas em fichas
supabase db execute --sql "SELECT COUNT(*) as total_columns FROM information_schema.columns WHERE table_name = 'fichas';"
```

### Método 3: psql (PostgreSQL CLI)

#### Pré-requisitos
```bash
# Ter psql instalado
psql --version

# Obter credenciais de conexão no Supabase Dashboard
# Settings → Database → Connection string
```

#### Executar Script
```bash
# Formato geral
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" \
  -f docs/gestao-scouter-fichas-table.sql

# Exemplo
psql "postgresql://postgres:SuaS3nha@db.xxxx.supabase.co:5432/postgres" \
  -f docs/gestao-scouter-fichas-table.sql
```

#### Verificar Execução
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" \
  -c "SELECT COUNT(*) FROM fichas;"
```

## Validação Pós-Execução

Após executar o script, siga o guia de validação completo:

**Ver: `docs/VALIDACAO_SCHEMA.md`**

### Validação Rápida

Execute no SQL Editor do Supabase:

```sql
-- 1. Verificar tabelas criadas (deve retornar 8)
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'fichas', 'roles', 'user_roles', 'profiles', 
    'permissions', 'sync_queue', 'sync_logs', 'sync_status'
  );

-- 2. Verificar colunas em fichas (deve retornar 60+)
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fichas';

-- 3. Verificar índices (deve retornar 30+)
SELECT COUNT(*) as total_indices
FROM pg_indexes
WHERE tablename = 'fichas'
  AND schemaname = 'public';

-- 4. Verificar triggers (deve retornar 3)
SELECT COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('set_updated_at', 'fichas_sync_trigger', 'on_auth_user_created');

-- 5. Verificar roles seed (deve retornar 5)
SELECT COUNT(*) as total_roles
FROM public.roles;
```

**Todos os valores devem bater com os comentados acima.**

## Próximos Passos

Após executar o script com sucesso:

1. ✅ **Validar Schema** (ver `docs/VALIDACAO_SCHEMA.md`)
   - Verificar todas as tabelas, índices e triggers
   - Testar políticas RLS
   - Executar queries de validação

2. ✅ **Importar Dados** (ver `docs/IMPORTACAO_DADOS.md`)
   - Escolher método de importação (Google Sheets, CSV, TabuladorMax)
   - Executar importação
   - Validar dados importados

3. ✅ **Testar Sincronização** (ver `docs/TESTE_SINCRONIZACAO.md`)
   - Testar sincronização unidirecional
   - Testar sincronização bidirecional
   - Validar triggers e fila de sync
   - Configurar monitoramento

4. ✅ **Testar Front-end**
   - Acessar aplicação: http://localhost:8080 (dev)
   - Verificar que dados são exibidos
   - Testar criação/edição de fichas
   - Verificar mapas e dashboards

## Troubleshooting

### Problema: "permission denied for table fichas"

**Causa:** Usuário sem permissões adequadas

**Solução:**
```sql
-- Executar como service_role ou superuser
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
```

### Problema: "relation fichas already exists"

**Causa:** Script já foi executado anteriormente

**Solução:**
- Isso é normal! O script é idempotente
- Continuar executando - cláusulas IF NOT EXISTS previnem erros
- Se quiser recriar do zero (⚠️ PERDA DE DADOS):
  ```sql
  DROP TABLE IF EXISTS public.fichas CASCADE;
  -- Re-executar script completo
  ```

### Problema: "function has_role already exists"

**Causa:** Função já existe de execução anterior

**Solução:**
```sql
-- Recriar função
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);
-- Re-executar seção PARTE 7 do script
```

### Problema: Script demora muito para executar

**Causa:** Muitos dados existentes ou índices sendo recriados

**Solução:**
- Aguardar conclusão (pode levar alguns minutos em produção)
- Executar em horário de baixo tráfego
- Considerar executar em lotes (comentar seções)

### Problema: Erro de sintaxe SQL

**Causa:** Cópia incompleta ou formatação quebrada

**Solução:**
- Garantir que copiou TODO o arquivo (880 linhas)
- Verificar que não há caracteres especiais quebrados
- Baixar arquivo original do GitHub se necessário

### Problema: Front-end não exibe dados

**Causa:** RLS bloqueando acesso ou dados não existem

**Solução:**
```sql
-- Verificar RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Verificar políticas
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Verificar dados
SELECT COUNT(*) FROM public.fichas;
```

## Backup e Rollback

### Fazer Backup Antes de Executar

#### Via Supabase Dashboard
1. Settings → Database → Backups
2. Click "Create Backup"
3. Aguardar conclusão
4. Anotar timestamp do backup

#### Via Supabase CLI
```bash
supabase db dump -f backup-before-schema-$(date +%Y%m%d-%H%M%S).sql
```

#### Via pg_dump
```bash
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" \
  -f backup-before-schema.sql \
  --clean \
  --if-exists
```

### Restaurar Backup (Rollback)

#### Via Supabase Dashboard
1. Settings → Database → Backups
2. Selecionar backup anterior
3. Click "Restore"
4. Confirmar (⚠️ sobrescreve dados atuais)

#### Via Supabase CLI
```bash
supabase db reset
# Depois importar backup
supabase db execute -f backup-before-schema.sql
```

#### Via psql
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" \
  -f backup-before-schema.sql
```

## Segurança e Boas Práticas

### ✅ Recomendações

1. **Sempre fazer backup antes de mudanças estruturais**
2. **Testar em ambiente de desenvolvimento primeiro**
3. **Executar em horário de baixo tráfego**
4. **Verificar espaço em disco antes de executar**
5. **Manter cópia local do script SQL**
6. **Documentar customizações específicas do projeto**
7. **Revisar políticas RLS antes de produção**
8. **Configurar monitoramento pós-deploy**

### ⚠️ Evitar

1. **NÃO executar DROP sem backup**
2. **NÃO modificar script sem entender impacto**
3. **NÃO desabilitar RLS em produção**
4. **NÃO compartilhar credenciais de service_role**
5. **NÃO executar em produção sem testar antes**

## Monitoramento Pós-Deploy

Após executar o script, monitorar:

```sql
-- 1. Verificar tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Verificar uso de índices
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 3. Verificar performance de queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%fichas%'
ORDER BY total_time DESC
LIMIT 10;
```

## Recursos Adicionais

- **Validação Completa:** `docs/VALIDACAO_SCHEMA.md`
- **Importação de Dados:** `docs/IMPORTACAO_DADOS.md`
- **Teste de Sincronização:** `docs/TESTE_SINCRONIZACAO.md`
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

## Suporte

Em caso de dúvidas ou problemas:

1. Verificar logs do Supabase Dashboard (Logs → Postgres)
2. Consultar documentação adicional (arquivos .md em docs/)
3. Verificar issues no GitHub do projeto
4. Abrir issue com:
   - Descrição do problema
   - Mensagem de erro completa
   - Versão do PostgreSQL/Supabase
   - Passos para reproduzir

---

**Última atualização:** 2025-10-18  
**Versão:** 1.0  
**Autor:** GitHub Copilot  
**Status:** ✅ Pronto para uso
