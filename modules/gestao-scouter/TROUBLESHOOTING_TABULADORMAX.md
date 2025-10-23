# 🔧 Troubleshooting TabuladorMax Integration

## 📋 Índice Rápido
- [Problema: "Não testado" após salvar](#problema-não-testado-após-salvar)
- [Problema: HTTP 401 Unauthorized](#problema-http-401-unauthorized)
- [Problema: HTTP 404 Function Not Found](#problema-http-404-function-not-found)
- [Problema: Project ID Incorreto](#problema-project-id-incorreto)
- [Checklist de Configuração Completa](#checklist-de-configuração-completa)

---

## Problema: "Não testado" após salvar

### Sintoma
Ao salvar a configuração do TabuladorMax, o status volta para "Não testado" mesmo após um teste bem-sucedido.

### Causa
Bug no código que limpava o `testResult` após salvar (linha 86 do `TabuladorMaxConfigPanel.tsx`).

### Solução
✅ **CORRIGIDO** - O código foi refatorado para manter o resultado do teste anterior após salvar.

### Como Verificar
1. Configurar credenciais do TabuladorMax
2. Clicar em "Testar Conexão"
3. Aguardar resultado (verde = sucesso)
4. Clicar em "Salvar Configuração"
5. **Resultado esperado:** Status continua "Conectado" (verde)

---

## Problema: HTTP 401 Unauthorized

### Sintoma
```
Error calling get-leads-count: HTTP 401
```

### Causa
Edge Functions no TabuladorMax exigem JWT por padrão, mas não conseguem validar chamadas externas sem `verify_jwt = false`.

### Solução

#### Opção 1: Configurar Edge Functions (Recomendado)

**No projeto TabuladorMax**, editar `supabase/config.toml`:

```toml
[functions.get-leads-count]
verify_jwt = false

[functions.get-leads-for-sync]
verify_jwt = false
```

Depois fazer deploy:
```bash
supabase functions deploy get-leads-count
supabase functions deploy get-leads-for-sync
```

#### Opção 2: Usar Fallback Automático (Implementado)

O Health Check agora tenta:
1. ✅ **Primeiro:** Chamar Edge Function `get-leads-count`
2. ⚠️ **Fallback:** Se receber 401/404, testa REST API diretamente
3. ✅ **Resultado:** Funciona mesmo sem Edge Functions configuradas

**Trade-off:** REST API é mais lenta que Edge Functions otimizadas.

---

## Problema: HTTP 404 Function Not Found

### Sintoma
```
Requested function 'get-leads-for-sync' was not found
```

### Causa
Edge Functions não foram criadas ou não estão deployadas no TabuladorMax.

### Solução

#### Passo 1: Criar Edge Functions no TabuladorMax

**Arquivo:** `supabase/functions/get-leads-count/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_leads: count || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

**Arquivo:** `supabase/functions/get-leads-for-sync/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lastSyncDate, limit = 1000 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (lastSyncDate) {
      query = query.gt('updated_at', lastSyncDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        leads: data,
        count: data.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

#### Passo 2: Configurar `supabase/config.toml` no TabuladorMax

```toml
project_id = "gkvvtfqfggddzotxltxf"

[functions.get-leads-count]
verify_jwt = false

[functions.get-leads-for-sync]
verify_jwt = false
```

#### Passo 3: Deploy

```bash
cd tabuladormax-project
supabase functions deploy get-leads-count
supabase functions deploy get-leads-for-sync
```

---

## Problema: Project ID Incorreto

### Sintoma
Configuração salva com UUID aleatório em vez do Project ID real:
```
fa1475f9-ea99-4684-a990-84bdf96f348a  ❌ ERRADO
gkvvtfqfggddzotxltxf                 ✅ CORRETO
```

### Causa
Campo aceita qualquer string, permitindo UUIDs inválidos.

### Solução
✅ **CORRIGIDO** - Migration adiciona:
1. **UPDATE** para corrigir valor existente
2. **CONSTRAINT** para validar formato (20 caracteres lowercase)

```sql
-- Executado automaticamente na migration
UPDATE tabulador_config 
SET project_id = 'gkvvtfqfggddzotxltxf'
WHERE project_id = 'fa1475f9-ea99-4684-a990-84bdf96f348a';

-- Prevenir erros futuros
ALTER TABLE tabulador_config
ADD CONSTRAINT tabulador_config_project_id_format 
CHECK (project_id ~ '^[a-z]{20}$');
```

---

## Checklist de Configuração Completa

### ✅ Gestão Scouter (Este Projeto)
- [x] Tabela `tabulador_config` criada
- [x] RLS policies configuradas
- [x] Edge Function `health-check-sync` corrigida com fallback
- [x] Edge Function `process-sync-queue` refatorada
- [x] Secrets configurados:
  - `TABULADOR_URL`
  - `TABULADOR_SERVICE_KEY` ou `SUPABASE_ANON_KEY`

### ⚠️ TabuladorMax (Projeto Externo)
- [ ] Tabela `leads` com coluna `updated_at`
- [ ] Edge Functions criadas:
  - [ ] `get-leads-count/index.ts`
  - [ ] `get-leads-for-sync/index.ts`
- [ ] `supabase/config.toml` configurado com `verify_jwt = false`
- [ ] Edge Functions deployadas
- [ ] RLS policies permitindo leitura anônima (se necessário)

### 🧪 Teste Final
1. **Configurar** TabuladorMax no painel
2. **Testar** conexão (deve ficar verde)
3. **Salvar** configuração (status deve manter verde)
4. **Executar** Health Check (deve retornar `healthy` ou `degraded`)
5. **Verificar** logs em `sync_logs_detailed`

---

## 🔍 Comandos de Diagnóstico

### Verificar Project ID Atual
```sql
SELECT project_id, url, enabled, created_at 
FROM tabulador_config;
```

### Verificar Logs de Sincronização
```sql
SELECT 
  created_at,
  status,
  error_message,
  records_synced,
  execution_time_ms
FROM sync_logs
WHERE sync_direction = 'gestao_to_tabulador'
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar Fila de Sincronização
```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest
FROM sync_queue
GROUP BY status;
```

### Testar Conexão Manual
```bash
curl -X POST https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/get-leads-count \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## 📚 Documentos Relacionados
- [LOVABLE_CLOUD_NO_SERVICE_KEY.md](./LOVABLE_CLOUD_NO_SERVICE_KEY.md) - Refatoração completa RLS
- [EDGE_FUNCTIONS_ACTIONS.md](./EDGE_FUNCTIONS_ACTIONS.md) - Instruções originais
- [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md) - Arquitetura de sincronização

---

## 🆘 Suporte
Se os problemas persistirem:
1. Verificar logs no Supabase Dashboard → Edge Functions
2. Verificar secrets no Supabase Dashboard → Settings → Edge Functions
3. Executar Health Check e analisar `recommendations`
4. Verificar RLS policies em ambos projetos
