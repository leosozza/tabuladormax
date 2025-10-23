# Validação do Schema do Supabase - Gestão Scouter

## Objetivo

Este documento descreve o processo de validação do schema do banco de dados após a execução do script `docs/gestao-scouter-fichas-table.sql`.

## Pré-requisitos

- Acesso ao Supabase Dashboard
- Permissões de leitura no banco de dados
- Script `gestao-scouter-fichas-table.sql` executado com sucesso

## 1. Validação das Tabelas

### 1.1 Verificar Existência das Tabelas Principais

Execute no SQL Editor do Supabase:

```sql
-- Listar todas as tabelas criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'fichas',
    'roles',
    'user_roles',
    'profiles',
    'permissions',
    'sync_queue',
    'sync_logs',
    'sync_status'
  )
ORDER BY table_name;
```

**Resultado Esperado:** 8 tabelas listadas

### 1.2 Verificar Contagem Total de Colunas em Fichas

```sql
-- Contar colunas na tabela fichas
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fichas';
```

**Resultado Esperado:** Aproximadamente 60+ colunas (incluindo as originais e as 36+ adicionadas)

### 1.3 Verificar Colunas Específicas Críticas

```sql
-- Verificar existência de colunas críticas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fichas'
  AND column_name IN (
    'id',
    'created_at',
    'updated_at',
    'criado',
    'nome',
    'name',
    'telefone',
    'celular',
    'sync_source',
    'last_synced_at',
    'last_sync_at',
    'aprovado'
  )
ORDER BY column_name;
```

**Resultado Esperado:** Todas as 12 colunas listadas acima devem existir

## 2. Validação dos Índices

### 2.1 Contar Índices na Tabela Fichas

```sql
-- Listar índices criados em fichas
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'fichas'
  AND schemaname = 'public'
ORDER BY indexname;
```

**Resultado Esperado:** 30+ índices listados

### 2.2 Verificar Índices Críticos

```sql
-- Verificar índices específicos críticos
SELECT indexname
FROM pg_indexes
WHERE tablename = 'fichas'
  AND schemaname = 'public'
  AND indexname IN (
    'fichas_pkey_unique',
    'idx_fichas_created_at',
    'idx_fichas_updated_at',
    'idx_fichas_sync_source',
    'idx_fichas_last_synced',
    'idx_fichas_deleted'
  )
ORDER BY indexname;
```

**Resultado Esperado:** Todos os 6 índices listados

## 3. Validação dos Triggers

### 3.1 Verificar Triggers Criados

```sql
-- Listar triggers ativos
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'set_updated_at',
    'fichas_sync_trigger',
    'on_auth_user_created'
  )
ORDER BY trigger_name;
```

**Resultado Esperado:** 3 triggers listados

### 3.2 Testar Trigger de updated_at

```sql
-- Criar uma ficha de teste
INSERT INTO public.fichas (nome, telefone, projeto, scouter)
VALUES ('Teste Trigger', '11999999999', 'Teste', 'Sistema')
RETURNING id, created_at, updated_at;

-- Anotar o ID retornado e aguardar 2 segundos

-- Atualizar a ficha de teste
UPDATE public.fichas
SET nome = 'Teste Trigger Atualizado'
WHERE nome = 'Teste Trigger'
RETURNING id, created_at, updated_at;

-- Verificar se updated_at foi atualizado (deve ser diferente de created_at)
SELECT 
  id,
  nome,
  created_at,
  updated_at,
  (updated_at > created_at) as trigger_funcionando
FROM public.fichas
WHERE nome = 'Teste Trigger Atualizado';

-- Limpar teste
DELETE FROM public.fichas WHERE nome = 'Teste Trigger Atualizado';
```

**Resultado Esperado:** `trigger_funcionando = true`

## 4. Validação de RLS (Row Level Security)

### 4.1 Verificar RLS Habilitado

```sql
-- Verificar se RLS está habilitado nas tabelas
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'fichas',
    'roles',
    'user_roles',
    'profiles',
    'permissions',
    'sync_queue',
    'sync_logs',
    'sync_status'
  )
ORDER BY tablename;
```

**Resultado Esperado:** Todas as tabelas com `rowsecurity = true`

### 4.2 Listar Políticas RLS

```sql
-- Listar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Resultado Esperado:** Múltiplas políticas listadas para cada tabela

### 4.3 Testar Política de Leitura Pública em Fichas

```sql
-- Testar leitura pública (deve funcionar sem autenticação)
SELECT COUNT(*) as total_fichas
FROM public.fichas
WHERE deleted = false;
```

**Resultado Esperado:** Query executada com sucesso (mesmo sem autenticação)

## 5. Validação de Funções

### 5.1 Verificar Funções Criadas

```sql
-- Listar funções customizadas
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_updated_at_column',
    'queue_ficha_for_sync',
    'handle_new_user',
    'has_role',
    'user_has_project_access'
  )
ORDER BY routine_name;
```

**Resultado Esperado:** 5 funções listadas

### 5.2 Testar Função has_role (Exemplo)

```sql
-- Testar função has_role com um UUID fictício
SELECT public.has_role('00000000-0000-0000-0000-000000000000'::UUID, 'admin'::app_role);
```

**Resultado Esperado:** `false` (UUID não existe, mas função executa sem erro)

## 6. Validação de Dados Seed

### 6.1 Verificar Roles Criados

```sql
-- Listar roles padrão
SELECT 
  id,
  name,
  description,
  project
FROM public.roles
ORDER BY id;
```

**Resultado Esperado:** 5 roles listados (admin, supervisor, scouter, gestor_telemarketing, telemarketing)

### 6.2 Verificar Permissões Criadas

```sql
-- Contar permissões por role
SELECT 
  r.name as role_name,
  COUNT(p.id) as total_permissions
FROM public.roles r
LEFT JOIN public.permissions p ON r.id = p.role_id
GROUP BY r.id, r.name
ORDER BY r.id;
```

**Resultado Esperado:** Cada role com múltiplas permissões (admin com mais)

### 6.3 Verificar Sync Status Inicial

```sql
-- Listar registros iniciais de sync_status
SELECT 
  id,
  project_name,
  last_sync_success,
  total_records,
  created_at
FROM public.sync_status
ORDER BY id;
```

**Resultado Esperado:** 2 registros (gestao_scouter, tabulador_max)

## 7. Validação de Compatibilidade de Campos

### 7.1 Verificar Aliases de Campos

```sql
-- Verificar que campos alias existem
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fichas' AND column_name = 'nome') THEN '✓'
    ELSE '✗'
  END as tem_nome,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fichas' AND column_name = 'name') THEN '✓'
    ELSE '✗'
  END as tem_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fichas' AND column_name = 'created_at') THEN '✓'
    ELSE '✗'
  END as tem_created_at,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fichas' AND column_name = 'criado') THEN '✓'
    ELSE '✗'
  END as tem_criado,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fichas' AND column_name = 'lat') THEN '✓'
    ELSE '✗'
  END as tem_lat,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fichas' AND column_name = 'latitude') THEN '✓'
    ELSE '✗'
  END as tem_latitude;
```

**Resultado Esperado:** Todos os campos devem mostrar '✓'

## 8. Teste de Inserção e Sincronização

### 8.1 Inserir Ficha de Teste

```sql
-- Inserir ficha de teste completa
INSERT INTO public.fichas (
  nome,
  telefone,
  celular,
  email,
  projeto,
  scouter,
  criado,
  valor_ficha,
  etapa,
  localizacao,
  lat,
  lng,
  aprovado,
  sync_source
) VALUES (
  'João da Silva Teste',
  '11987654321',
  '11987654321',
  'joao.teste@example.com',
  'Projeto Teste',
  'Scouter Teste',
  CURRENT_DATE,
  150.00,
  'Contato',
  'São Paulo, SP',
  -23.550520,
  -46.633308,
  NULL,
  'Gestao'
) RETURNING id, created_at, updated_at, sync_source;
```

**Resultado Esperado:** Ficha inserida com sucesso, retornando ID e timestamps

### 8.2 Verificar Entrada na Fila de Sincronização

```sql
-- Verificar se a ficha foi adicionada à fila de sync
SELECT 
  sq.id,
  sq.ficha_id,
  sq.operation,
  sq.sync_direction,
  sq.status,
  sq.created_at
FROM public.sync_queue sq
WHERE sq.ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'João da Silva Teste'
)
ORDER BY sq.created_at DESC
LIMIT 1;
```

**Resultado Esperado:** 1 registro na fila com operation='INSERT' e status='pending'

### 8.3 Limpar Dados de Teste

```sql
-- Limpar dados de teste
DELETE FROM public.sync_queue 
WHERE ficha_id IN (
  SELECT id::TEXT FROM public.fichas WHERE nome = 'João da Silva Teste'
);

DELETE FROM public.fichas 
WHERE nome = 'João da Silva Teste';
```

## 9. Checklist Final de Validação

Use esta checklist para confirmar que tudo está correto:

- [ ] **Tabelas:** 8 tabelas principais criadas
- [ ] **Colunas Fichas:** 60+ colunas incluindo as 36+ adicionadas
- [ ] **Índices:** 30+ índices na tabela fichas
- [ ] **Triggers:** 3 triggers ativos (set_updated_at, fichas_sync_trigger, on_auth_user_created)
- [ ] **RLS:** Habilitado em todas as 8 tabelas
- [ ] **Políticas RLS:** Múltiplas políticas criadas (incluindo leitura pública para fichas)
- [ ] **Funções:** 5 funções customizadas criadas
- [ ] **Roles Seed:** 5 roles padrão criados
- [ ] **Permissões Seed:** Permissões criadas para cada role
- [ ] **Sync Status:** 2 registros iniciais criados
- [ ] **Aliases de Campos:** Campos created_at/criado, nome/name, lat/latitude existem
- [ ] **Trigger updated_at:** Funciona corretamente
- [ ] **Trigger Sync Queue:** Adiciona fichas à fila automaticamente
- [ ] **Inserção de Dados:** Funciona sem erros
- [ ] **Leitura Pública:** Queries SELECT funcionam sem autenticação

## 10. Solução de Problemas

### Problema: Colunas faltando

**Sintoma:** Verificação mostra menos colunas que o esperado

**Solução:**
```sql
-- Re-executar apenas a parte de criação de colunas
-- Copiar da seção PARTE 2 do script gestao-scouter-fichas-table.sql
```

### Problema: Triggers não funcionam

**Sintoma:** updated_at não muda ao atualizar registros

**Solução:**
```sql
-- Recriar trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.fichas;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Problema: RLS bloqueando acesso

**Sintoma:** Queries retornam 0 resultados mesmo com dados no banco

**Solução:**
```sql
-- Verificar e recriar política de leitura pública
DROP POLICY IF EXISTS "fichas_read_all" ON public.fichas;
CREATE POLICY "fichas_read_all" 
  ON public.fichas 
  FOR SELECT 
  USING (true);
```

### Problema: Função has_role retorna erro

**Sintoma:** Erro "function public.has_role does not exist"

**Solução:**
```sql
-- Recriar função has_role
-- Copiar da seção PARTE 7 do script gestao-scouter-fichas-table.sql
```

## 11. Validação via Front-end

Após validar o schema no banco, teste no front-end:

1. **Acesse a aplicação:** http://localhost:8080 (dev) ou URL de produção
2. **Navegue para Leads/Fichas**
3. **Verifique:**
   - [ ] Dados são carregados sem erros
   - [ ] Campos são exibidos corretamente
   - [ ] Filtros funcionam
   - [ ] Criação de nova ficha funciona
   - [ ] Edição de ficha existente funciona
   - [ ] Não há erros no console do navegador (F12)

## 12. Logs e Monitoramento

Após validação inicial, monitore:

1. **Logs de Sincronização:**
```sql
SELECT * FROM public.sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

2. **Status de Sincronização:**
```sql
SELECT * FROM public.sync_status
ORDER BY updated_at DESC;
```

3. **Fila de Sincronização:**
```sql
SELECT 
  status,
  COUNT(*) as total
FROM public.sync_queue
GROUP BY status;
```

## Conclusão

Se todos os itens da checklist estão marcados e os testes passaram, o schema foi validado com sucesso e está pronto para uso em produção.

**Próximos passos:**
- Executar importação de dados históricos (ver `docs/IMPORTACAO_DADOS.md`)
- Configurar e testar sincronização bidirecional (ver `docs/TESTE_SINCRONIZACAO.md`)
- Monitorar performance e ajustar índices conforme necessário

---

**Última atualização:** 2025-10-18  
**Versão:** 1.0  
**Autor:** GitHub Copilot
