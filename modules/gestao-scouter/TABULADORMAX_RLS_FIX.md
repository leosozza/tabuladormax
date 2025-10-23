# ✅ Corrigir HTTP 401 - RLS Permissiva no TabuladorMax

## 🎯 Objetivo
Permitir que o Health Check do **Gestão Scouter** acesse a tabela `leads` do **TabuladorMax** via REST API (fallback).

---

## 📋 Passo 1: Executar SQL no TabuladorMax

**⚠️ IMPORTANTE: Execute este SQL no projeto TabuladorMax (`gkvvtfqfggddzotxltxf`)**

### Opção A: Via Supabase Dashboard

1. Acesse: `https://supabase.com/dashboard/project/gkvvtfqfggddzotxltxf/editor`
2. Clique em **SQL Editor**
3. Execute:

```sql
-- Permitir que anon role leia a tabela leads (somente SELECT)
CREATE POLICY "Allow anon read leads for sync" 
ON public.leads 
FOR SELECT 
TO anon 
USING (true);
```

### Opção B: Via Migration Tool

No projeto TabuladorMax, criar arquivo `supabase/migrations/<timestamp>_allow_anon_read_leads.sql`:

```sql
-- Permitir que anon role leia a tabela leads (somente SELECT)
CREATE POLICY "Allow anon read leads for sync" 
ON public.leads 
FOR SELECT 
TO anon 
USING (true);
```

---

## 🧪 Passo 2: Testar Conexão REST API

Execute no **Gestão Scouter** (ou no terminal local):

```bash
curl -X HEAD \
  "https://gkvvtfqfggddzotxltxf.supabase.co/rest/v1/leads?select=id&limit=1" \
  -H "apikey: YOUR_TABULADOR_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer YOUR_TABULADOR_PUBLISHABLE_KEY"
```

**Resultado esperado:**
```
HTTP/2 200 OK
content-range: 0-0/123
```

❌ Se retornar `HTTP 401 Unauthorized`, a política não foi aplicada corretamente.

---

## ✅ Passo 3: Validar Health Check

No **Gestão Scouter**, acesse:
- **Dashboard** → **Integrações** → **TabuladorMax Sync**
- Clique em **"Verificar Saúde"**

**Resultado esperado:**

```json
{
  "status": "healthy",
  "tabulador": {
    "reachable": true,
    "latency_ms": 150,
    "total_leads": 1234
  },
  "recommendations": [
    "✅ 1,234 leads disponíveis no TabuladorMax"
  ]
}
```

---

## 🔒 Segurança

### ✅ O que a política permite:
- Leitura pública da tabela `leads` via REST API (com `publishable_key`)
- Fallback do Health Check funcionar

### ❌ O que a política NÃO permite:
- Inserir dados (`INSERT`)
- Atualizar dados (`UPDATE`)
- Deletar dados (`DELETE`)

### 🛡️ Recomendações adicionais:

Se quiser restringir ainda mais, você pode limitar por colunas específicas:

```sql
-- Exemplo: Permitir apenas leitura de id, nome, criado
CREATE POLICY "Allow anon read limited leads" 
ON public.leads 
FOR SELECT 
TO anon 
USING (true)
WITH CHECK (false);
```

Ou adicionar filtros temporais:

```sql
-- Exemplo: Permitir apenas leads dos últimos 30 dias
CREATE POLICY "Allow anon read recent leads" 
ON public.leads 
FOR SELECT 
TO anon 
USING (criado >= NOW() - INTERVAL '30 days');
```

---

## 🐛 Troubleshooting

### Erro: "policy already exists"

```sql
-- Remover política existente
DROP POLICY IF EXISTS "Allow anon read leads for sync" ON public.leads;

-- Criar novamente
CREATE POLICY "Allow anon read leads for sync" 
ON public.leads 
FOR SELECT 
TO anon 
USING (true);
```

### Erro: "permission denied for table leads"

```sql
-- Verificar se RLS está ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'leads' AND schemaname = 'public';

-- Se rowsecurity = false, ativar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
```

### Erro: "could not connect to server"

Verificar se o `TABULADOR_URL` está correto no Gestão Scouter:
- Deve ser: `https://gkvvtfqfggddzotxltxf.supabase.co`

---

## 📊 Verificação de Políticas RLS

Para listar todas as políticas RLS da tabela `leads`:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'leads' 
ORDER BY policyname;
```

---

## ✅ Checklist de Conclusão

- [ ] SQL executado no TabuladorMax
- [ ] REST API retorna HTTP 200 (via `curl` HEAD)
- [ ] Health Check retorna `status: "healthy"`
- [ ] `tabulador.reachable: true`
- [ ] `tabulador.total_leads` > 0
- [ ] Sem erros HTTP 401 nos logs

---

## 📚 Documentos Relacionados

- `TROUBLESHOOTING_TABULADORMAX.md` - Guia completo de troubleshooting
- `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md` - Arquitetura de sincronização
- `docs/DIAGNOSTICO_RLS.md` - Diagnóstico de problemas RLS

---

**🎉 Pronto! Após executar o SQL no TabuladorMax, o Health Check deve funcionar perfeitamente.**
