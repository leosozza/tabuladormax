# ⚠️ AÇÕES MANUAIS NECESSÁRIAS - EDGE FUNCTIONS TABULADORMAX

## 🎯 O QUE FOI FEITO NO GESTÃO SCOUTER

✅ Migration SQL executada: usuários sincronizados de `auth.users` para `public.users`
✅ Edge Functions atualizadas para chamar TabuladorMax via Edge Functions
✅ Componentes de UI melhorados com melhor feedback de erros
✅ Edge Functions redundantes removidas
✅ Código limpo e otimizado

---

## 📋 PRÓXIMOS PASSOS (VOCÊ PRECISA FAZER)

### 1️⃣ **CRIAR EDGE FUNCTIONS NO TABULADORMAX**

Você precisa criar 2 novas Edge Functions no projeto TabuladorMax:
https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a

#### **Edge Function 1: `get-leads-count`**

**Arquivo:** `supabase/functions/get-leads-count/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.193.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({
        success: true,
        total_leads: count,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

#### **Edge Function 2: `get-leads-for-sync`**

**Arquivo:** `supabase/functions/get-leads-for-sync/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.193.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lastSyncDate, limit = 5000 } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Buscar leads com data >= lastSyncDate
    const { data, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .gte('updated_at', lastSyncDate || '1970-01-01')
      .order('updated_at', { ascending: true })
      .limit(limit)
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({
        success: true,
        leads: data,
        total: count,
        synced_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

### 2️⃣ **ADICIONAR `updated_at` NA TABELA LEADS DO TABULADORMAX**

Execute este SQL no **TabuladorMax** (Backend → Database → SQL Editor):

```sql
-- 1. Adicionar coluna updated_at
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Popular com dados existentes
UPDATE public.leads
SET updated_at = COALESCE(updated_at, modificado, criado, NOW())
WHERE updated_at IS NULL;

-- 3. Criar índice
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

-- 4. Criar trigger para atualizar automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### 3️⃣ **VERIFICAR CONFIGURAÇÃO NO GESTÃO SCOUTER**

No projeto Gestão Scouter, verifique se os Secrets estão configurados:

- **TABULADOR_URL**: `https://gkvvtfqfggddzotxltxf.supabase.co`
- **TABULADOR_SERVICE_KEY**: Pode ser a ANON KEY! (não precisa mais de SERVICE_ROLE_KEY)

---

## 🧪 TESTES

### 1. Teste de Conectividade

Vá para: **Configurações → Integrações → TabuladorMax**

Clique em: **Testar Conexão**

**Resultado esperado:**
```
✅ Conexão bem-sucedida!
240452 leads encontrados no TabuladorMax via Edge Function.
```

---

### 2. Teste de Sincronização

Clique em: **Sincronizar Agora**

**Resultado esperado:**
```
✅ Sincronização concluída
0 enviados, 240452 recebidos
```

---

### 3. Teste de Usuários

Vá para: **Configurações → Usuários**

**Resultado esperado:**
- Deve mostrar seu usuário com role "admin"
- Se estiver vazio, clique em "Recarregar"

---

### 4. Teste de Permissões

Vá para: **Configurações → Permissões**

**Resultado esperado:**
- Deve mostrar abas: Admin, Supervisor, Scouter
- Deve permitir alterar permissões sem erros

---

## 🎯 RESUMO

| Ação | Local | Status |
|------|-------|--------|
| ✅ Migration usuários | Gestão Scouter | CONCLUÍDO |
| ✅ Atualizar Edge Functions | Gestão Scouter | CONCLUÍDO |
| ✅ Melhorar UX | Gestão Scouter | CONCLUÍDO |
| ✅ Limpar código | Gestão Scouter | CONCLUÍDO |
| ⚠️ Criar `get-leads-count` | TabuladorMax | **PENDENTE - VOCÊ PRECISA FAZER** |
| ⚠️ Criar `get-leads-for-sync` | TabuladorMax | **PENDENTE - VOCÊ PRECISA FAZER** |
| ⚠️ Adicionar `updated_at` | TabuladorMax | **PENDENTE - VOCÊ PRECISA FAZER** |

---

## 💡 BENEFÍCIOS DA NOVA ARQUITETURA

### ✅ **Segurança Aumentada**
- SERVICE_ROLE_KEY nunca sai do TabuladorMax
- Apenas Edge Functions expõem dados de forma controlada
- ANON_KEY é suficiente para chamar Edge Functions

### ✅ **Simplicidade**
- Não precisa copiar/colar chaves manualmente
- Ambos projetos no Lovable Cloud se comunicam naturalmente
- Edge Functions deployadas automaticamente

### ✅ **Manutenibilidade**
- Código centralizado em cada projeto
- Fácil de debugar (logs em cada Edge Function)
- Fácil de escalar (adicionar autenticação, rate limiting, etc)

---

## 📞 PRECISA DE AJUDA?

Se encontrar problemas:

1. Verifique os logs no Console do navegador
2. Verifique os logs das Edge Functions no Lovable
3. Execute "Diagnóstico Completo" na página de integrações
4. Me envie a mensagem de erro completa
