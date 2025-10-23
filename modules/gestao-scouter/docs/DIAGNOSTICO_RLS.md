# 🔍 Guia de Diagnóstico RLS - Gestão Scouter

## ✅ Solução Implementada (2025-01-24)

### Problema Identificado

A política RLS `leads_admin_all` estava **INCOMPLETA** - faltava a cláusula `WITH CHECK (true)` necessária para operações de `UPDATE` dentro de `UPSERT`.

**Sintoma:** Erro 42501 (insufficient privilege) ao tentar sincronizar dados do TabuladorMax.

**Causa Raiz:** 
```sql
-- ❌ POLÍTICA ANTIGA (INCOMPLETA)
CREATE POLICY "leads_admin_all"
  ON public.leads FOR ALL
  USING (true);  -- ✅ Permite SELECT/ler
  -- ❌ FALTA: WITH CHECK (true) -- Necessário para INSERT/UPDATE
```

Quando o PostgREST faz um `UPSERT`:
1. Tenta `INSERT` → precisa de `WITH CHECK (true)` ✅
2. Se o registro já existe, tenta `UPDATE` → precisa de `USING (true)` **E** `WITH CHECK (true)` ❌

### Solução Aplicada

```sql
-- ✅ POLÍTICA CORRETA (COMPLETA)
CREATE POLICY "leads_full_access"
  ON public.leads
  FOR ALL                          -- SELECT, INSERT, UPDATE, DELETE
  TO public, anon, authenticated   -- Todos os tipos de conexão
  USING (true)                     -- ✅ Permite ler/visualizar
  WITH CHECK (true);               -- ✅ Permite inserir/modificar
```

**Resultado:** UPSERT agora funciona completamente para sincronização! 🎉

**Por que `WITH CHECK (true)` é essencial?**

| Operação | Precisa de `USING` | Precisa de `WITH CHECK` | Status Antes | Status Depois |
|----------|-------------------|------------------------|--------------|---------------|
| `SELECT` | ✅ | ❌ | ✅ OK | ✅ OK |
| `INSERT` | ❌ | ✅ | ✅ OK | ✅ OK |
| `UPDATE` | ✅ | ✅ | ❌ **FALHAVA** | ✅ **CORRIGIDO** |
| `UPSERT` | ✅ | ✅ | ❌ **FALHAVA** | ✅ **CORRIGIDO** |

---

## Visão Geral

Este documento explica como usar o sistema de diagnóstico RLS (Row Level Security) para resolver problemas de sincronização entre TabuladorMax e Gestão Scouter.

## 🎯 Quando Usar

Use o diagnóstico RLS quando:
- ❌ Erro **42501** (insufficient privilege) aparece nos logs
- ❌ Sincronização falha com "permission denied"
- ❌ UPSERTs não funcionam mesmo com service_role
- ❌ Após modificar políticas RLS na tabela `leads`
- ❌ Após restaurar backup do banco de dados

## 🚀 Como Executar

### Método 1: Via Interface (Recomendado)

1. Acesse o painel **Integrações** no Gestão Scouter
2. Localize a seção **"Sincronização TabuladorMax"**
3. Clique no botão **"Diagnóstico RLS"**
4. Aguarde os resultados aparecerem em notificações

### Método 2: Via API Direta

```bash
curl -X POST https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/diagnose-gestao-rls \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Método 3: Via Supabase Dashboard

1. Acesse o Supabase Dashboard do Gestão Scouter
2. Vá em **Edge Functions** > **diagnose-gestao-rls**
3. Clique em **Invoke** (sem body)
4. Veja os resultados no JSON de resposta

## 📊 O Que o Diagnóstico Faz

O diagnóstico executa 4 testes automaticamente:

### 1️⃣ Teste de Conexão
- **Objetivo:** Verificar se consegue acessar a tabela `leads`
- **O que verifica:** Conectividade com o banco de dados
- **Tempo:** ~500ms

### 2️⃣ Verificação de Políticas RLS
- **Objetivo:** Validar se a política `service_role_upsert_leads` existe e está correta
- **O que verifica:**
  - ✅ Política existe
  - ✅ `cmd` = `ALL` (permite todas operações)
  - ✅ `roles` = `[service_role]`
  - ✅ `USING (true)` está presente
  - ✅ `WITH CHECK (true)` está presente
- **Tempo:** ~800ms

### 3️⃣ Reload de Schema Cache
- **Objetivo:** Recarregar o cache do PostgREST para ver as políticas atualizadas
- **O que faz:** Executa `NOTIFY pgrst, 'reload schema';`
- **Tempo:** Instantâneo (efeito em até 10 segundos)

### 4️⃣ Teste de UPSERT
- **Objetivo:** Validar se consegue fazer UPSERT na tabela `leads`
- **O que faz:**
  - Insere um registro de teste
  - Tenta fazer UPSERT (update + insert)
  - Deleta o registro de teste
- **Tempo:** ~1200ms

## ✅ Interpretando os Resultados

### Resultado: Todos os Testes Passaram ✅

```json
{
  "success": true,
  "tests": {
    "connection": { "status": "ok" },
    "rls_policies": { "status": "ok" },
    "schema_reload": { "status": "ok" },
    "upsert_test": { "status": "ok" }
  },
  "recommendations": [
    "✅ Todos os testes passaram! O sistema está configurado corretamente."
  ]
}
```

**Ação:** Nenhuma ação necessária! O sistema está funcionando.

### Resultado: Erro de Conexão ❌

```json
{
  "tests": {
    "connection": { 
      "status": "error", 
      "message": "Erro de conexão: ..." 
    }
  }
}
```

**Causa:** Credenciais incorretas ou banco de dados inacessível

**Solução:**
1. Verifique se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão corretos
2. Teste conexão direta com `psql` ou Supabase Dashboard
3. Verifique se o banco de dados está online

### Resultado: Política RLS Incorreta ❌

```json
{
  "tests": {
    "rls_policies": { 
      "status": "error", 
      "message": "Política service_role_upsert_leads não encontrada ou incorreta" 
    }
  },
  "recommendations": [
    "Executar SQL: CREATE POLICY ..."
  ]
}
```

**Causa:** Política `service_role_upsert_leads` não existe ou está mal configurada

**Solução:**
```sql
-- 1. Remover política antiga (se existir)
DROP POLICY IF EXISTS "service_role_upsert_leads" ON public.leads;

-- 2. Criar política correta
CREATE POLICY "service_role_upsert_leads"
  ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Recarregar schema cache
NOTIFY pgrst, 'reload schema';
```

### Resultado: Erro no Reload de Schema ⚠️

```json
{
  "tests": {
    "schema_reload": { 
      "status": "warning", 
      "message": "Não foi possível recarregar automaticamente..." 
    }
  }
}
```

**Causa:** Falta de permissão para executar `NOTIFY pgrst`

**Solução:**
Execute manualmente no **SQL Editor do Gestão Scouter**:
```sql
NOTIFY pgrst, 'reload schema';
```

Aguarde **10 segundos** e tente a sincronização novamente.

### Resultado: Erro 42501 no UPSERT ❌

```json
{
  "tests": {
    "upsert_test": { 
      "status": "error", 
      "message": "ERRO 42501: Sem permissão para UPSERT. Política RLS incorreta!",
      "details": {
        "error_code": "42501",
        "hint": "A política precisa ter USING (true) WITH CHECK (true)"
      }
    }
  },
  "recommendations": [
    "CRÍTICO: Execute NOTIFY pgrst, 'reload schema'; e aguarde 10 segundos"
  ]
}
```

**Causas Possíveis:**
1. **Política incompleta:** Tem `USING (true)` mas falta `WITH CHECK (true)` ⚠️ **CAUSA MAIS COMUM**
2. Schema cache não foi recarregado após criar/modificar a política RLS
3. Política requer `auth.uid()` mas a função está usando `anon` key

**Solução DEFINITIVA (já aplicada - 2025-01-24):**

```sql
-- 1. Remover políticas antigas conflitantes
DROP POLICY IF EXISTS "leads_admin_all" ON public.leads;
DROP POLICY IF EXISTS "service_role_upsert_leads" ON public.leads;
DROP POLICY IF EXISTS "leads_authenticated_read" ON public.leads;

-- 2. Criar política COMPLETA com USING e WITH CHECK
CREATE POLICY "leads_full_access"
  ON public.leads
  FOR ALL                          -- SELECT, INSERT, UPDATE, DELETE
  TO public, anon, authenticated   -- Todas as conexões
  USING (true)                     -- ✅ Permite ler (SELECT, UPDATE)
  WITH CHECK (true);               -- ✅ Permite modificar (INSERT, UPDATE)

-- 3. CRÍTICO: Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- 4. Verificar se a política foi criada corretamente
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'leads';
-- Deve mostrar: qual = true E with_check = true
```

**Se o problema persistir após aplicar a solução:**
1. Aguarde **10 segundos** após executar `NOTIFY pgrst`
2. Execute o diagnóstico novamente
3. Verifique a política RLS manualmente:
   ```sql
   SELECT 
     policyname, 
     cmd, 
     roles, 
     qual::text as using_expression,
     with_check::text as with_check_expression
   FROM pg_policies 
   WHERE tablename = 'leads' AND schemaname = 'public';
   ```

## 🔧 Troubleshooting Avançado

### Problema: Diagnóstico não executa

**Sintomas:**
- Botão "Diagnóstico RLS" não responde
- Erro "Edge function not found"
- Timeout na requisição

**Solução:**
1. Verifique se a edge function `diagnose-gestao-rls` foi deployada
2. Verifique logs da edge function no Supabase Dashboard
3. Tente executar via `curl` diretamente

### Problema: Diagnóstico passa mas sincronização falha

**Sintomas:**
- Todos os testes do diagnóstico passam ✅
- Mas sincronização do TabuladorMax ainda falha com erro 42501

**Causa:** O problema está no **TabuladorMax**, não no Gestão Scouter

**Solução:**
1. Verifique no **TabuladorMax** se `GESTAO_SERVICE_KEY` está correto
2. Deve ser a **Service Role Key** do Gestão Scouter, **NÃO** a Anon Key
3. Verifique logs da edge function `export-to-gestao-scouter-batch` no TabuladorMax
4. Confirme que está usando o endpoint correto: `https://jstsrgyxrrlklnzgsihd.supabase.co`

### Problema: Erro "Column does not exist"

**Sintomas:**
- Teste de UPSERT falha com "column XYZ does not exist"
- Mas o campo existe na tabela

**Causa:** Schema cache desatualizado

**Solução:**
1. Execute `NOTIFY pgrst, 'reload schema';`
2. Aguarde 10 segundos
3. Execute diagnóstico novamente

## 📋 Checklist de Diagnóstico Manual

Se o diagnóstico automático não resolver, use este checklist:

### ✅ Verificar Tabela `leads`
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;
```

### ✅ Verificar RLS Ativado
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'leads' AND relnamespace = 'public'::regnamespace;
```
Deve retornar `relrowsecurity = true`

### ✅ Verificar Políticas
```sql
SELECT 
  policyname, 
  cmd, 
  roles, 
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'leads' AND schemaname = 'public';
```

Deve ter pelo menos:
```
policyname                 | cmd | roles          | using | with_check
---------------------------|-----|----------------|-------|------------
service_role_upsert_leads  | ALL | {service_role} | true  | true
```

### ✅ Testar UPSERT Manual
```sql
-- Com service_role key
INSERT INTO public.leads (id, nome, telefone, projeto, criado)
VALUES ('test-manual', 'Teste Manual', '999999999', 'TEST', NOW())
ON CONFLICT (id) DO UPDATE SET nome = 'Teste Manual Atualizado';
```

Se falhar com erro 42501, a política RLS está incorreta.

## 🚀 Workflow Recomendado

Para resolver problemas de sincronização:

1. **Execute Diagnóstico** → Clique em "Diagnóstico RLS"
2. **Analise Resultados** → Veja quais testes falharam
3. **Siga Recomendações** → Execute os SQLs sugeridos
4. **Aguarde 10s** → Espere schema cache recarregar
5. **Teste Novamente** → Execute diagnóstico novamente
6. **Valide Sincronização** → Tente sincronizar do TabuladorMax

## 📞 Suporte

Se após seguir todos os passos o problema persistir:

1. **Copie o JSON completo** do diagnóstico
2. **Copie os logs** da edge function `diagnose-gestao-rls`
3. **Copie os logs** da edge function `export-to-gestao-scouter-batch` (TabuladorMax)
4. **Documente** o passo a passo que você tentou
5. **Abra um issue** com todas essas informações

## 📚 Arquivos Relacionados

- Edge Function: `supabase/functions/diagnose-gestao-rls/index.ts`
- Componente UI: `src/components/dashboard/integrations/TabuladorSync.tsx`
- Documentação: `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md`
- Diagnóstico: `SYNC_DIAGNOSTICS_GUIDE.md`
